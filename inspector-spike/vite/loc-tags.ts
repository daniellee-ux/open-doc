import path from 'node:path';
import { parse } from '@babel/parser';
import type { Plugin } from 'vite';

/**
 * Source-location tagging — the reliable backbone of click-to-source, and the
 * fix for the line-number drift this spike surfaced.
 *
 * Why not just use React's fiber `_debugSource`? Because in this Vite +
 * @vitejs/plugin-react setup its line numbers do NOT match the on-disk file
 * (they reflect post-transform positions), so writing edits back lands on the
 * wrong element. open-slide hit the same wall and solved it the same way: parse
 * the ORIGINAL source and inject explicit `data-odc-loc="rel:line:col"` onto
 * every JSX opening element. The positions come from the same bytes the
 * write-back middleware re-parses, so they match exactly.
 *
 * Runs `enforce: 'pre'` (before plugin-react), so the attribute becomes a normal
 * JSX prop. It is therefore readable in TWO places at runtime:
 *   - host elements authored in the doc  → the attribute is in the DOM, and
 *   - framework-component usages (<Prose…>) → the attribute is in that
 *     component fiber's `memoizedProps` (it never reaches the DOM, but the
 *     inspector's fiber climb reads it there).
 * That second case is what makes cross-component, cross-file resolution work.
 */
export function locTagsPlugin(): Plugin {
  let root = '';
  return {
    name: 'opendoc-loc-tags',
    enforce: 'pre',
    configResolved(config) {
      root = config.root;
    },
    transform(code, id) {
      const clean = id.split('?')[0];
      if (!/\.(tsx|jsx)$/.test(clean)) return null;
      const norm = clean.replace(/\\/g, '/');
      if (!norm.includes('/docs/')) return null; // only tag author documents

      const rel = path.relative(root, clean).replace(/\\/g, '/');
      let ast: ReturnType<typeof parse>;
      try {
        ast = parse(code, { sourceType: 'module', plugins: ['typescript', 'jsx'] });
      } catch {
        return null; // let the normal pipeline report the syntax error
      }

      type Ins = { at: number; text: string };
      const inserts: Ins[] = [];
      const seen = new Set<unknown>();
      const visit = (node: any) => {
        if (!node || typeof node !== 'object' || seen.has(node)) return;
        seen.add(node);
        if (Array.isArray(node)) {
          for (const n of node) visit(n);
          return;
        }
        if (node.type === 'JSXOpeningElement' && node.name && node.loc) {
          const has = (node.attributes ?? []).some(
            (a: any) => a.type === 'JSXAttribute' && a.name?.name === 'data-odc-loc',
          );
          if (!has) {
            const loc = `${rel}:${node.loc.start.line}:${node.loc.start.column}`;
            inserts.push({ at: node.name.end, text: ` data-odc-loc="${loc}"` });
          }
        }
        for (const key of Object.keys(node)) {
          if (key === 'loc' || key === 'range' || key === 'start' || key === 'end') continue;
          const v = node[key];
          if (v && typeof v === 'object') visit(v);
        }
      };
      visit((ast as any).program);
      if (!inserts.length) return null;

      inserts.sort((a, b) => b.at - a.at); // splice from the end so offsets hold
      let out = code;
      for (const ins of inserts) out = out.slice(0, ins.at) + ins.text + out.slice(ins.at);
      return { code: out, map: null };
    },
  };
}
