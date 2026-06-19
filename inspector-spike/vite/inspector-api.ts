import { existsSync, readFileSync, writeFileSync } from 'node:fs';
import path from 'node:path';
import { parse } from '@babel/parser';
import type { Plugin } from 'vite';

/**
 * Dev-only API that turns an inspector comment into a `@doc-comment` marker in
 * the source — the write-back half of open-slide's edit engine, ported to docs.
 *
 * Given { file, line, column } (from the fiber `_debugSource`), it re-parses the
 * file, finds the JSX element whose opening tag starts at that location, and
 * splices a `{/* @doc-comment: "…" *​/}` marker as the element's first child.
 * String-splice (not codegen) keeps the rest of the file byte-identical, so HMR
 * stays surgical — the same property that makes open-slide's loc tags reliable.
 */

interface CommentBody {
  /** Path relative to project root, from the data-odc-loc tag. */
  rel: string;
  line: number;
  column: number;
  text: string;
}

interface OpeningEl {
  start: number;
  end: number;
  selfClosing: boolean;
  nameEnd: number;
  line: number;
  column: number;
}

function collectOpeningElements(ast: unknown): OpeningEl[] {
  const out: OpeningEl[] = [];
  const seen = new Set<unknown>();
  const visit = (node: any) => {
    if (!node || typeof node !== 'object' || seen.has(node)) return;
    seen.add(node);
    if (Array.isArray(node)) {
      for (const n of node) visit(n);
      return;
    }
    if (node.type === 'JSXOpeningElement' && node.loc) {
      out.push({
        start: node.start,
        end: node.end,
        selfClosing: !!node.selfClosing,
        nameEnd: node.name?.end ?? node.start,
        line: node.loc.start.line,
        column: node.loc.start.column,
      });
    }
    for (const key of Object.keys(node)) {
      if (key === 'loc' || key === 'range' || key === 'start' || key === 'end') continue;
      const v = node[key];
      if (v && typeof v === 'object') visit(v);
    }
  };
  visit((ast as any).program ?? ast);
  return out;
}

function pickTarget(els: OpeningEl[], line: number, column: number): OpeningEl | null {
  const sameLine = els.filter((e) => e.line === line);
  const pool = sameLine.length ? sameLine : els;
  if (!pool.length) return null;
  // _debugSource column may be 0- or 1-based depending on tooling; match the
  // closest, trying both interpretations.
  let best = pool[0];
  let bestDist = Number.POSITIVE_INFINITY;
  for (const e of pool) {
    const d = Math.min(Math.abs(e.column - column), Math.abs(e.column - (column - 1)));
    const lineDist = Math.abs(e.line - line) * 1000;
    if (d + lineDist < bestDist) {
      best = e;
      bestDist = d + lineDist;
    }
  }
  return best;
}

export function inspectorApiPlugin(): Plugin {
  let root = '';
  let docsRoot = '';
  return {
    name: 'opendoc-inspector-api',
    configResolved(config) {
      root = config.root;
      docsRoot = path.resolve(config.root, 'docs');
    },
    configureServer(server) {
      server.middlewares.use('/__odc/comment', (req, res) => {
        if (req.method !== 'POST') {
          res.statusCode = 405;
          res.end('Method Not Allowed');
          return;
        }
        let raw = '';
        req.on('data', (c) => {
          raw += c;
        });
        req.on('end', () => {
          const send = (code: number, body: unknown) => {
            res.statusCode = code;
            res.setHeader('content-type', 'application/json');
            res.end(JSON.stringify(body));
          };
          try {
            const { rel, line, column, text } = JSON.parse(raw) as CommentBody;
            const abs = path.resolve(root, rel);
            // Security: only files under docs/ may be written.
            if (!abs.startsWith(docsRoot + path.sep)) {
              return send(403, { error: `Refusing to write outside docs/: ${abs}` });
            }
            if (!/\.(tsx|jsx)$/.test(abs) || !existsSync(abs)) {
              return send(404, { error: `Not a doc source file: ${abs}` });
            }

            const code = readFileSync(abs, 'utf8');
            const ast = parse(code, {
              sourceType: 'module',
              plugins: ['typescript', 'jsx'],
            });
            const target = pickTarget(collectOpeningElements(ast), line, column);
            if (!target) {
              return send(422, { error: `No JSX element found near ${line}:${column}` });
            }

            const safe = JSON.stringify(text); // escaped, and can't contain */ unescaped
            const marker = `{/* @doc-comment: ${safe} */}`;

            let next: string;
            let insertOffset: number;
            if (target.selfClosing) {
              // Can't have children — tag it with a data attribute instead.
              insertOffset = target.nameEnd;
              next = `${code.slice(0, insertOffset)} data-odc-comment=${safe}${code.slice(insertOffset)}`;
            } else {
              // Insert as the element's first child (always valid JSX).
              insertOffset = target.end;
              next = `${code.slice(0, insertOffset)}${marker}${code.slice(insertOffset)}`;
            }
            writeFileSync(abs, next, 'utf8');

            send(200, { ok: true, rel, line: target.line, column: target.column });
          } catch (err) {
            send(500, { error: String((err as Error).message ?? err) });
          }
        });
      });
    },
  };
}
