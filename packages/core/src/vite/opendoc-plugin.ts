import { existsSync } from 'node:fs';
import path from 'node:path';
import fg from 'fast-glob';
import { normalizePath, type Plugin, type ViteDevServer } from 'vite';
import type { OpendocConfig } from '../config';
import { DEFAULT_PAGE } from '../sdk';

/**
 * Discovery + virtual modules — the document analog of open-slide's
 * open-slide-plugin. Globs `docs/<id>/index.tsx` into `virtual:opendoc/docs`
 * (a `docIds` list + a `loadDoc(id)` dynamic-import switch), exposes resolved
 * config via `virtual:opendoc/config`, and full-reloads on doc add/remove/edit.
 */

const DOCS_VMOD = 'virtual:opendoc/docs';
const CONFIG_VMOD = 'virtual:opendoc/config';

export interface OpendocPluginOptions {
  userCwd: string;
  config: OpendocConfig;
  version: string;
}

function resolved(id: string): string {
  return `\0${id}`;
}

async function findDocs(docsRoot: string): Promise<string[]> {
  if (!existsSync(docsRoot)) return [];
  const hits = await fg('*/index.{tsx,jsx,ts,js}', {
    cwd: docsRoot,
    absolute: true,
    onlyFiles: true,
  });
  return hits.sort();
}

function toId(absFile: string, docsRoot: string): string {
  return path.relative(docsRoot, absFile).split(path.sep)[0];
}

function genDocsModule(files: string[], docsRoot: string, isDev: boolean): string {
  const entries = files.map((abs) => ({ id: toId(abs, docsRoot), abs }));
  const ids = JSON.stringify(entries.map((e) => e.id).sort());
  const cases = entries
    .map((e) => {
      const fsPath = `/@fs${normalizePath(e.abs)}`;
      const imp = isDev
        ? `import(/* @vite-ignore */ ${JSON.stringify(fsPath)} + ${JSON.stringify('?t=')} + __t)`
        : `import(${JSON.stringify(e.abs)})`;
      return `    case ${JSON.stringify(e.id)}: return ${imp};`;
    })
    .join('\n');
  const devToken = isDev
    ? `let __t = 0;
if (import.meta.hot) {
  import.meta.hot.on('opendoc:doc-changed', () => { __t = Date.now(); });
}`
    : 'const __t = 0;';
  return `// virtual:opendoc/docs — generated
export const docIds = ${ids};
${devToken}
export async function loadDoc(id) {
  switch (id) {
${cases}
    default: throw new Error('Doc not found: ' + id);
  }
}
`;
}

export function opendocPlugin(opts: OpendocPluginOptions): Plugin {
  const { userCwd, config, version } = opts;
  const docsDir = config.docsDir ?? 'docs';
  const docsRoot = path.resolve(userCwd, docsDir);
  let isDev = false;

  const isDocFile = (p: string): boolean => {
    const rel = path.relative(docsRoot, p);
    if (rel.startsWith('..') || path.isAbsolute(rel)) return false;
    return /[\\/]?[^\\/]+[\\/](index|.+)\.(tsx|jsx|ts|js)$/.test(rel) || rel.includes(path.sep);
  };

  const invalidateDocs = (server: ViteDevServer) => {
    const mod = server.moduleGraph.getModuleById(resolved(DOCS_VMOD));
    if (mod) server.moduleGraph.invalidateModule(mod);
  };

  return {
    name: 'opendoc',
    config(_c, env) {
      isDev = env.command === 'serve';
      return { server: { fs: { allow: [userCwd] } } };
    },
    resolveId(id) {
      if (id === DOCS_VMOD) return resolved(DOCS_VMOD);
      if (id === CONFIG_VMOD) return resolved(CONFIG_VMOD);
      return null;
    },
    async load(id) {
      if (id === resolved(DOCS_VMOD)) {
        const files = await findDocs(docsRoot);
        return genDocsModule(files, docsRoot, isDev);
      }
      if (id === resolved(CONFIG_VMOD)) {
        const build = config.build ?? {};
        const resolvedConfig = {
          docsDir,
          page: config.page ?? DEFAULT_PAGE,
          build: {
            showDocBrowser: build.showDocBrowser ?? true,
            showDocUi: build.showDocUi ?? true,
            allowHtmlDownload: build.allowHtmlDownload ?? true,
            allowPdfDownload: build.allowPdfDownload ?? true,
          },
          version,
        };
        return `export default ${JSON.stringify(resolvedConfig)};\n`;
      }
      return null;
    },
    handleHotUpdate(ctx) {
      // Edits to a doc file: refresh content WITHOUT a full reload (which would
      // drop UI state like the inspector). Bump the import token via a custom
      // event and re-import; suppress Vite's default HMR by returning []. This
      // mirrors open-slide's handleHotUpdate.
      if (ctx.file.startsWith(docsRoot + path.sep)) {
        ctx.server.ws.send({ type: 'custom', event: 'opendoc:doc-changed', data: {} });
        return [];
      }
      return undefined;
    },
    configureServer(server) {
      if (existsSync(docsRoot)) server.watcher.add(docsRoot);

      let reloadTimer: ReturnType<typeof setTimeout> | null = null;
      const reload = () => {
        if (reloadTimer) clearTimeout(reloadTimer);
        reloadTimer = setTimeout(() => {
          reloadTimer = null;
          invalidateDocs(server);
          server.ws.send({ type: 'full-reload' });
        }, 120);
      };

      // Adding/removing a doc changes the doc list → full reload is appropriate.
      server.watcher.on('add', (p) => {
        if (isDocFile(p)) reload();
      });
      server.watcher.on('unlink', (p) => {
        if (isDocFile(p)) reload();
      });
    },
  };
}
