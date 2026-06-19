import { useState } from 'react';
import { DocBody } from './components/DocBody';
import { DocSurface } from './components/DocSurface';
import { PagePreview } from './components/PagePreview';
import { Toc } from './components/Toc';
import docModuleDefault, { design, meta } from '../docs/quarterly-report';

// In real Opendoc this comes from `virtual:opendoc/docs` (the Vite plugin).
// The spike imports the document module directly to validate the renderer.
const sections = docModuleDefault;

export default function App() {
  const [preview, setPreview] = useState(false);

  return (
    <div className="odc-app">
      <header className="odc-toolbar">
        <span className="brand">
          Opendoc<span className="dot">.</span>
        </span>
        <span className="doc-title">{meta.title}</span>
        <span className="spacer" />
        <button
          type="button"
          className={`odc-btn${preview ? ' odc-btn--active' : ''}`}
          onClick={() => setPreview((v) => !v)}
          title="Paginate with paged.js into real pages"
        >
          {preview ? 'Reading view' : 'Page preview'}
        </button>
        <button type="button" className="odc-btn odc-btn--primary" onClick={() => window.print()}>
          Print / Save PDF
        </button>
      </header>

      <Toc />

      <main className="odc-main">
        <article className="odc-reading">
          <DocSurface design={design}>
            <DocBody sections={sections} />
          </DocSurface>
        </article>
      </main>

      {preview ? <PagePreview sections={sections} design={design} /> : null}
    </div>
  );
}
