import { useEffect, useLayoutEffect, useState } from 'react';
import config from 'virtual:opendoc/config';
import { docIds } from 'virtual:opendoc/docs';
import { designPresets, designToCssVars, resolveDesign } from '../design';
import { DocBody } from './components/DocBody';
import { DocSurface } from './components/DocSurface';
import { Inspector } from './components/Inspector';
import { AssetsPanel } from './components/AssetsPanel';
import { numberFootnotes } from './components/DocBody';
import { PagePreview } from './components/PagePreview';
import { Toc } from './components/Toc';
import {
  buildDocx,
  buildHtml,
  buildMarkdown,
  exportDocx,
  exportHtml,
  exportMarkdown,
} from './lib/export';
import { useDocModule } from './lib/use-doc-module';

const isDev = import.meta.env.DEV;

function navigate(to: string) {
  window.history.pushState({}, '', to);
  window.dispatchEvent(new PopStateEvent('popstate'));
}

function usePath(): string {
  const [path, setPath] = useState(window.location.pathname);
  useEffect(() => {
    const on = () => setPath(window.location.pathname);
    window.addEventListener('popstate', on);
    return () => window.removeEventListener('popstate', on);
  }, []);
  return path;
}

export function App() {
  const path = usePath();
  const docMatch = /^\/d\/([^/]+)/.exec(path);
  if (docMatch) return <DocPage id={decodeURIComponent(docMatch[1])} />;
  if (path === '/themes') return <ThemesPage />;
  if (!config.build.showDocBrowser && docIds.length) return <DocPage id={docIds[0]} />;
  return <Home />;
}

function Home() {
  return (
    <div className="odc-home">
      <div className="odc-home-inner">
        <h1 className="odc-home-title">
          Opendoc<span className="dot">.</span>
        </h1>
        <p className="odc-home-sub">
          The agent-native document framework.{' '}
          <a
            className="odc-home-link"
            href="/themes"
            onClick={(e) => {
              e.preventDefault();
              navigate('/themes');
            }}
          >
            Themes →
          </a>
        </p>
        {docIds.length === 0 ? (
          <p className="odc-home-empty">
            No documents yet. Create <code>docs/&lt;id&gt;/index.tsx</code> and it appears here.
          </p>
        ) : (
          <ul className="odc-home-list">
            {docIds.map((id) => (
              <li key={id}>
                <a
                  href={`/d/${encodeURIComponent(id)}`}
                  onClick={(e) => {
                    e.preventDefault();
                    navigate(`/d/${encodeURIComponent(id)}`);
                  }}
                >
                  <span className="odc-home-id">{id}</span>
                  <span className="odc-home-arrow">→</span>
                </a>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}

function ThemesPage() {
  const names = Object.keys(designPresets);
  return (
    <div className="odc-themes">
      <header className="odc-toolbar">
        <a
          className="odc-icon-btn"
          href="/"
          title="Library"
          onClick={(e) => {
            e.preventDefault();
            navigate('/');
          }}
        >
          ←
        </a>
        <span className="brand">
          Opendoc<span className="dot">.</span>
        </span>
        <span className="doc-title">Themes</span>
      </header>
      <div className="odc-themes-grid">
        {names.map((name) => {
          const d = designPresets[name];
          return (
            <div key={name} className="odc-theme-card">
              <div className="odc-theme-name">
                {name}
                <code>meta.theme: '{name}'</code>
              </div>
              <div className="odc-theme-sample" data-odc-doc style={designToCssVars(d)}>
                <div className="odc-h2" style={{ marginTop: 0 }}>
                  The quick brown fox
                </div>
                <p className="odc-prose" style={{ marginBottom: 0 }}>
                  Jumps over the lazy dog. Body text set at the document measure with the theme's
                  fonts, scale, and leading — exactly what a document renders with.
                </p>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

function DocPage({ id }: { id: string }) {
  const { doc, error } = useDocModule(id);
  const [preview, setPreview] = useState(false);
  const [inspect, setInspect] = useState(false);
  const [assets, setAssets] = useState(false);
  const showUi = config.build.showDocUi;
  const title = doc?.meta?.title ?? id;

  // Cross-section footnote numbering (client-only; never in the export path).
  useLayoutEffect(() => {
    if (doc) numberFootnotes(document.querySelector('.odc-doc-root') ?? document);
  }, [doc]);

  // Report the reader's cursor to .opendoc/current.json (the current-doc skill).
  useEffect(() => {
    const hot = import.meta.hot;
    if (!hot || !doc) return;
    const scroller = document.querySelector<HTMLElement>('.odc-scroll');
    let queued = false;
    const send = () => {
      if (queued) return;
      queued = true;
      requestAnimationFrame(() => {
        queued = false;
        const headings = Array.from(
          document.querySelectorAll<HTMLElement>('.odc-reading h1[id], h2[id], h3[id]'),
        );
        let anchor = headings[0]?.id;
        for (const h of headings) {
          if (h.getBoundingClientRect().top < 140) anchor = h.id;
          else break;
        }
        hot.send('opendoc:current', {
          docId: id,
          title,
          headingAnchor: anchor ?? null,
          scrollOffset: Math.round(scroller?.scrollTop ?? 0),
          view: preview ? 'page-preview' : 'reading',
        });
      });
    };
    send();
    scroller?.addEventListener('scroll', send, { passive: true });
    return () => scroller?.removeEventListener('scroll', send);
  }, [id, title, preview, doc]);

  if (error) {
    return (
      <div className="odc-msg">
        <a className="odc-back" href="/" onClick={(e) => { e.preventDefault(); navigate('/'); }}>
          ← Library
        </a>
        <h2>Failed to load “{id}”</h2>
        <pre className="odc-err">{error}</pre>
      </div>
    );
  }
  if (!doc) {
    return (
      <div className="odc-msg">
        <span className="odc-loading">Loading {id}…</span>
      </div>
    );
  }

  const sections = doc.default ?? [];
  const design = resolveDesign({ design: doc.design, theme: doc.meta?.theme });

  if (isDev) {
    // Test/automation hook: pure string builders for HTML/Markdown export.
    (window as unknown as Record<string, unknown>).__odc = {
      id,
      meta: doc.meta,
      sectionCount: sections.length,
      buildHtml: () => buildHtml(sections, design, doc.meta),
      buildMarkdown: () => buildMarkdown(sections, doc.meta),
      buildDocx: () => buildDocx(sections, doc.meta),
    };
  }

  return (
    <div className="odc-app">
      {showUi && (
        <header className="odc-toolbar">
          {config.build.showDocBrowser && (
            <a
              className="odc-icon-btn"
              href="/"
              title="Library"
              onClick={(e) => { e.preventDefault(); navigate('/'); }}
            >
              ←
            </a>
          )}
          <span className="brand">
            Opendoc<span className="dot">.</span>
          </span>
          <span className="doc-title">{title}</span>
          <span className="spacer" />
          {isDev && (
            <button
              type="button"
              className={`odc-btn${inspect ? ' odc-btn--active' : ''}`}
              onClick={() => setInspect((v) => !v)}
            >
              {inspect ? 'Inspecting' : 'Inspect'}
            </button>
          )}
          {isDev && (
            <button
              type="button"
              className={`odc-btn${assets ? ' odc-btn--active' : ''}`}
              onClick={() => setAssets((v) => !v)}
            >
              Assets
            </button>
          )}
          <button
            type="button"
            className={`odc-btn${preview ? ' odc-btn--active' : ''}`}
            onClick={() => setPreview((v) => !v)}
          >
            {preview ? 'Reading view' : 'Page preview'}
          </button>
          {config.build.allowHtmlDownload && (
            <div className="odc-menu">
              <button type="button" className="odc-btn">
                Export ▾
              </button>
              <div className="odc-menu-list">
                <button type="button" onClick={() => exportHtml(sections, id, design, doc.meta)}>
                  HTML
                </button>
                <button type="button" onClick={() => exportMarkdown(sections, id, doc.meta)}>
                  Markdown
                </button>
                <button type="button" onClick={() => exportDocx(sections, id, doc.meta)}>
                  Word (.docx)
                </button>
              </div>
            </div>
          )}
          {config.build.allowPdfDownload && (
            <button type="button" className="odc-btn odc-btn--primary" onClick={() => window.print()}>
              Print / Save PDF
            </button>
          )}
        </header>
      )}

      <div className="odc-shell">
        <Toc docKey={id} />
        <main className="odc-scroll">
          <div className="odc-doc-root">
            <article className="odc-reading">
              <DocSurface design={design} title={doc.meta?.title}>
                <DocBody sections={sections} />
              </DocSurface>
            </article>
          </div>
        </main>
      </div>

      {preview ? (
        <PagePreview sections={sections} design={design} title={doc.meta?.title} />
      ) : null}
      {assets ? <AssetsPanel docId={id} onClose={() => setAssets(false)} /> : null}
      {isDev && showUi ? <Inspector active={inspect} /> : null}
    </div>
  );
}
