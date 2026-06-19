import { mkdirSync, renameSync, writeFileSync } from 'node:fs';
import path from 'node:path';
import type { Plugin } from 'vite';

/**
 * Writes `.opendoc/current.json` whenever the reader's view changes (PLAN §5,
 * the `current-doc` skill's data source). The client sends `opendoc:current`
 * over the HMR socket with the doc id, the active heading anchor, scroll offset,
 * view, and any inspector selection. Replaces open-slide's pageIndex/totalPages
 * cursor with a section/anchor cursor.
 */
export function currentPlugin(opts: { userCwd: string }): Plugin {
  const dir = path.join(opts.userCwd, '.opendoc');
  const file = path.join(dir, 'current.json');
  return {
    name: 'opendoc-current',
    configureServer(server) {
      server.ws.on('opendoc:current', (data: Record<string, unknown>) => {
        try {
          mkdirSync(dir, { recursive: true });
          const payload = JSON.stringify(
            { ...data, updatedAt: new Date().toISOString() },
            null,
            2,
          );
          const tmp = `${file}.tmp`;
          writeFileSync(tmp, payload, 'utf8');
          renameSync(tmp, file); // atomic
        } catch {
          // best-effort; never crash the dev server over a cursor write
        }
      });
    },
  };
}
