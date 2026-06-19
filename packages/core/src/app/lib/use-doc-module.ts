import { useEffect, useState } from 'react';
import { loadDoc } from 'virtual:opendoc/docs';
import type { DocModule } from '../../sdk';

/** Loads a document module by id and live-reloads it when the source changes. */
export function useDocModule(id: string): { doc: DocModule | null; error: string | null } {
  const [doc, setDoc] = useState<DocModule | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let alive = true;
    const run = () => {
      loadDoc(id)
        .then((m) => {
          if (alive) {
            setDoc(m);
            setError(null);
          }
        })
        .catch((e) => {
          if (alive) {
            setDoc(null);
            setError(String(e?.message ?? e));
          }
        });
    };
    run();

    const hot = import.meta.hot;
    hot?.on('opendoc:doc-changed', run);
    return () => {
      alive = false;
      hot?.off('opendoc:doc-changed', run);
    };
  }, [id]);

  return { doc, error };
}
