import { existsSync, readdirSync, statSync } from 'node:fs';
import path from 'node:path';
import { normalizePath, type Plugin } from 'vite';

/**
 * Assets API (PLAN M6) — lists files under `docs/<id>/assets/` so the in-app
 * assets panel can show what a document has to work with. Read-only: authors add
 * files in their editor; this surfaces and previews them.
 */
export function assetsPlugin(opts: { docsRoot: string }): Plugin {
  const { docsRoot } = opts;
  const imageExts = new Set(['png', 'jpg', 'jpeg', 'gif', 'svg', 'webp', 'avif']);
  return {
    name: 'opendoc-assets',
    configureServer(server) {
      server.middlewares.use('/__odc/assets', (req, res, next) => {
        if (req.method !== 'GET') return next();
        const url = new URL(req.url ?? '', 'http://localhost');
        const doc = url.searchParams.get('doc') ?? '';
        res.setHeader('content-type', 'application/json');
        if (!/^[A-Za-z0-9][\w-]*$/.test(doc)) {
          res.statusCode = 400;
          return res.end(JSON.stringify({ error: 'invalid doc id' }));
        }
        const dir = path.join(docsRoot, doc, 'assets');
        const files = existsSync(dir)
          ? readdirSync(dir)
              .filter((f) => !f.startsWith('.'))
              .map((name) => {
                const abs = path.join(dir, name);
                const ext = path.extname(name).slice(1).toLowerCase();
                return {
                  name,
                  ext,
                  size: statSync(abs).size,
                  isImage: imageExts.has(ext),
                  url: `/@fs${normalizePath(abs)}`,
                };
              })
          : [];
        res.end(JSON.stringify({ doc, dir: `docs/${doc}/assets`, files }));
      });
    },
  };
}
