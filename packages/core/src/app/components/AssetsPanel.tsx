import { useEffect, useState } from 'react';

/**
 * Assets panel (PLAN M6) — lists files under docs/<id>/assets/ via the dev API,
 * with image previews. Read-only: authors add files in their editor; reference
 * them in a document as `import logo from './assets/logo.svg'`.
 */
type AssetFile = { name: string; ext: string; size: number; isImage: boolean; url: string };

export function AssetsPanel({ docId, onClose }: { docId: string; onClose: () => void }) {
  const [data, setData] = useState<{ dir: string; files: AssetFile[] } | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let alive = true;
    fetch(`/__odc/assets?doc=${encodeURIComponent(docId)}`)
      .then((r) => r.json())
      .then((d) => alive && (d.error ? setError(d.error) : setData(d)))
      .catch((e) => alive && setError(String(e)));
    return () => {
      alive = false;
    };
  }, [docId]);

  const kb = (n: number) => (n < 1024 ? `${n} B` : `${(n / 1024).toFixed(1)} KB`);

  return (
    <div className="odc-assets-backdrop">
      <div className="odc-assets-panel">
        <div className="odc-assets-head">
          <span>Assets</span>
          <code>{data?.dir ?? `docs/${docId}/assets`}</code>
          <button type="button" className="odc-btn" onClick={onClose}>
            Close
          </button>
        </div>
        {error ? <div className="odc-err">{error}</div> : null}
        {data && data.files.length === 0 ? (
          <p className="odc-assets-empty">
            No assets yet. Create <code>docs/{docId}/assets/</code> and drop images, fonts, or data
            files there.
          </p>
        ) : null}
        <div className="odc-assets-grid">
          {data?.files.map((f) => (
            <div key={f.name} className="odc-asset">
              <div className="odc-asset-thumb">
                {f.isImage ? <img src={f.url} alt={f.name} /> : <span className="odc-asset-ext">.{f.ext}</span>}
              </div>
              <div className="odc-asset-name" title={f.name}>
                {f.name}
              </div>
              <div className="odc-asset-size">{kb(f.size)}</div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
