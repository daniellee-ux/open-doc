import { existsSync, readFileSync, writeFileSync } from 'node:fs';
import path from 'node:path';
import { parse } from '@babel/parser';
import type { Plugin } from 'vite';

/**
 * Dev-only edit engine for the inspector (PLAN §4.3, M3). Resolves a clicked
 * element to a source location via its injected `data-odc-loc`, then mutates the
 * source by string-splice (no codegen → byte-stable, surgical HMR). Routes:
 *   POST /__odc/comment  — insert a `@doc-comment` marker
 *   POST /__odc/edit     — apply a real edit (op: 'text' | 'style')
 *   POST /__odc/undo     — revert the last write
 *   POST /__odc/redo     — re-apply the last undone write
 * All writes funnel through `applyWrite`, which records an undo/redo history.
 */

interface ElInfo {
  line: number;
  column: number;
  nameEnd: number; // offset right after the tag name (where new attrs go)
  openEnd: number; // offset right after the opening tag '>'
  selfClosing: boolean;
  childrenStart: number | null; // null when self-closing
  childrenEnd: number | null;
  styleObjStart: number | null; // offset just inside the style `{{` , or null
}

function collectElements(ast: unknown): ElInfo[] {
  const out: ElInfo[] = [];
  const seen = new Set<unknown>();
  const visit = (node: any) => {
    if (!node || typeof node !== 'object' || seen.has(node)) return;
    seen.add(node);
    if (Array.isArray(node)) {
      for (const n of node) visit(n);
      return;
    }
    if (node.type === 'JSXElement' && node.openingElement?.loc) {
      const open = node.openingElement;
      let styleObjStart: number | null = null;
      for (const attr of open.attributes ?? []) {
        if (
          attr.type === 'JSXAttribute' &&
          attr.name?.name === 'style' &&
          attr.value?.type === 'JSXExpressionContainer' &&
          attr.value.expression?.type === 'ObjectExpression'
        ) {
          styleObjStart = attr.value.expression.start + 1; // just after '{'
        }
      }
      out.push({
        line: open.loc.start.line,
        column: open.loc.start.column,
        nameEnd: open.name?.end ?? open.start,
        openEnd: open.end,
        selfClosing: !!open.selfClosing,
        childrenStart: open.selfClosing ? null : open.end,
        childrenEnd: open.selfClosing ? null : (node.closingElement?.start ?? null),
        styleObjStart,
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

function pickTarget(els: ElInfo[], line: number, column: number): ElInfo | null {
  const sameLine = els.filter((e) => e.line === line);
  const pool = sameLine.length ? sameLine : els;
  if (!pool.length) return null;
  let best = pool[0];
  let bestDist = Number.POSITIVE_INFINITY;
  for (const e of pool) {
    const colDist = Math.min(Math.abs(e.column - column), Math.abs(e.column - (column - 1)));
    const dist = Math.abs(e.line - line) * 1000 + colDist;
    if (dist < bestDist) {
      best = e;
      bestDist = dist;
    }
  }
  return best;
}

function styleEntries(props: Record<string, string>): string {
  return Object.entries(props)
    .map(([k, v]) => `${k}: ${JSON.stringify(String(v))}`)
    .join(', ');
}

export function inspectorApiPlugin(opts: { userCwd: string; docsRoot: string }): Plugin {
  const { userCwd, docsRoot } = opts;
  const undoStack: { file: string; before: string }[] = [];
  const redoStack: { file: string; before: string }[] = [];

  const resolveDocFile = (rel: string): string | null => {
    const abs = path.resolve(userCwd, rel);
    if (!abs.startsWith(docsRoot + path.sep)) return null;
    if (!/\.(tsx|jsx)$/.test(abs) || !existsSync(abs)) return null;
    return abs;
  };

  const applyWrite = (abs: string, next: string, stack: 'undo' | 'clear-redo') => {
    const before = readFileSync(abs, 'utf8');
    if (stack === 'undo') {
      undoStack.push({ file: abs, before });
      redoStack.length = 0;
    }
    writeFileSync(abs, next, 'utf8');
  };

  return {
    name: 'opendoc-inspector-api',
    configureServer(server) {
      const readBody = (req: import('node:http').IncomingMessage): Promise<any> =>
        new Promise((resolve, reject) => {
          let raw = '';
          req.on('data', (c) => {
            raw += c;
          });
          req.on('end', () => {
            try {
              resolve(raw ? JSON.parse(raw) : {});
            } catch (e) {
              reject(e);
            }
          });
        });

      const json = (res: import('node:http').ServerResponse, code: number, body: unknown) => {
        res.statusCode = code;
        res.setHeader('content-type', 'application/json');
        res.end(JSON.stringify(body));
      };

      server.middlewares.use('/__odc/comment', (req, res, next) => {
        if (req.method !== 'POST') return next();
        readBody(req)
          .then((body) => {
            const { rel, line, column, text } = body;
            const abs = resolveDocFile(rel);
            if (!abs) return json(res, 403, { error: `Not an editable doc file: ${rel}` });
            const code = readFileSync(abs, 'utf8');
            const ast = parse(code, { sourceType: 'module', plugins: ['typescript', 'jsx'] });
            const t = pickTarget(collectElements(ast), line, column);
            if (!t) return json(res, 422, { error: `No JSX element near ${line}:${column}` });
            const safe = JSON.stringify(text);
            const nextCode = t.selfClosing
              ? `${code.slice(0, t.nameEnd)} data-odc-comment=${safe}${code.slice(t.nameEnd)}`
              : `${code.slice(0, t.openEnd)}{/* @doc-comment: ${safe} */}${code.slice(t.openEnd)}`;
            applyWrite(abs, nextCode, 'undo');
            json(res, 200, { ok: true, rel, line: t.line });
          })
          .catch((err) => json(res, 500, { error: String(err?.message ?? err) }));
      });

      server.middlewares.use('/__odc/edit', (req, res, next) => {
        if (req.method !== 'POST') return next();
        readBody(req)
          .then((body) => {
            const { rel, line, column, op, payload } = body;
            const abs = resolveDocFile(rel);
            if (!abs) return json(res, 403, { error: `Not an editable doc file: ${rel}` });
            const code = readFileSync(abs, 'utf8');
            const ast = parse(code, { sourceType: 'module', plugins: ['typescript', 'jsx'] });
            const t = pickTarget(collectElements(ast), line, column);
            if (!t) return json(res, 422, { error: `No JSX element near ${line}:${column}` });

            let nextCode: string;
            if (op === 'text') {
              if (t.selfClosing || t.childrenStart == null || t.childrenEnd == null) {
                return json(res, 422, { error: 'Cannot set text on a self-closing element' });
              }
              const text = String(payload?.text ?? '');
              const replacement = /[<>{}]/.test(text) ? `{${JSON.stringify(text)}}` : text;
              nextCode =
                code.slice(0, t.childrenStart) + replacement + code.slice(t.childrenEnd);
            } else if (op === 'style') {
              const props = (payload?.props ?? {}) as Record<string, string>;
              if (!Object.keys(props).length) return json(res, 400, { error: 'No style props' });
              const entries = styleEntries(props);
              if (t.styleObjStart != null) {
                nextCode =
                  code.slice(0, t.styleObjStart) + ` ${entries},` + code.slice(t.styleObjStart);
              } else {
                nextCode =
                  code.slice(0, t.nameEnd) + ` style={{ ${entries} }}` + code.slice(t.nameEnd);
              }
            } else {
              return json(res, 400, { error: `Unknown op: ${op}` });
            }
            applyWrite(abs, nextCode, 'undo');
            json(res, 200, { ok: true, rel, line: t.line, op });
          })
          .catch((err) => json(res, 500, { error: String(err?.message ?? err) }));
      });

      server.middlewares.use('/__odc/undo', (req, res, next) => {
        if (req.method !== 'POST') return next();
        const entry = undoStack.pop();
        if (!entry) return json(res, 200, { ok: false, empty: true });
        const current = readFileSync(entry.file, 'utf8');
        redoStack.push({ file: entry.file, before: current });
        writeFileSync(entry.file, entry.before, 'utf8');
        json(res, 200, { ok: true, file: path.relative(userCwd, entry.file) });
      });

      server.middlewares.use('/__odc/redo', (req, res, next) => {
        if (req.method !== 'POST') return next();
        const entry = redoStack.pop();
        if (!entry) return json(res, 200, { ok: false, empty: true });
        const current = readFileSync(entry.file, 'utf8');
        undoStack.push({ file: entry.file, before: current });
        writeFileSync(entry.file, entry.before, 'utf8');
        json(res, 200, { ok: true, file: path.relative(userCwd, entry.file) });
      });
    },
  };
}
