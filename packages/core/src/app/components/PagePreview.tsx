import { useEffect, useRef, useState } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import docCss from '../doc.css?raw';
import type { DesignSystem } from '../../design';
import type { Section } from '../../sdk';
import { DocBody } from './DocBody';
import { DocSurface } from './DocSurface';

/**
 * In-app paged-media preview (PLAN §6, Path B) — the one-click escape hatch for
 * "continuous-flow has no WYSIWYG pages on screen". Renders the same Section[]
 * tree to static HTML, then runs paged.js over it with the document stylesheet
 * to fragment it into real pages. paged.js is imported lazily so it never bloats
 * the base runtime (a finding from the renderer spike).
 */
export function PagePreview({
  sections,
  design,
  title,
}: {
  sections: Section[];
  design?: DesignSystem;
  title?: string;
}) {
  const ref = useRef<HTMLDivElement>(null);
  const [status, setStatus] = useState<'rendering' | 'done' | 'error'>('rendering');
  const [pages, setPages] = useState(0);

  useEffect(() => {
    const target = ref.current;
    if (!target) return;
    let cancelled = false;

    // Defer so a StrictMode double-invoke doesn't double-render (paged.js
    // appends to the DOM directly, not via setState).
    const timer = setTimeout(async () => {
      if (cancelled) return;
      target.innerHTML = '';
      setStatus('rendering');
      const html = renderToStaticMarkup(
        <DocSurface design={design} title={title}>
          <DocBody sections={sections} />
        </DocSurface>,
      );
      const blob = new Blob([docCss], { type: 'text/css' });
      const url = URL.createObjectURL(blob);
      try {
        const { Previewer } = await import('pagedjs');
        const flow = await new Previewer().preview(html, [url], target);
        if (!cancelled) {
          setPages((flow as { total: number }).total);
          setStatus('done');
        }
      } catch (err) {
        if (!cancelled) {
          console.error('[opendoc] paged.js preview failed', err);
          setStatus('error');
        }
      } finally {
        URL.revokeObjectURL(url);
      }
    }, 0);

    return () => {
      cancelled = true;
      clearTimeout(timer);
    };
  }, [sections, design, title]);

  return (
    <div className="odc-preview-backdrop">
      <div className="odc-preview-status">
        {status === 'rendering' && 'Paginating…'}
        {status === 'done' && `${pages} pages · paged.js`}
        {status === 'error' && 'paged.js failed (see console)'}
      </div>
      <div ref={ref} className="odc-preview-pages" />
    </div>
  );
}
