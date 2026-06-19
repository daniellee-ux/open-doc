import { useEffect, useRef, useState } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { Previewer } from 'pagedjs';
import docCss from '../doc.css?raw';
import type { DesignSystem } from '../design';
import type { Section } from '../sdk';
import { DocBody } from './DocBody';
import { DocSurface } from './DocSurface';

/**
 * In-app paged-media preview (PLAN §6, Path B). Renders the SAME Section[] tree
 * to static HTML, then runs paged.js over it with the document stylesheet to
 * fragment it into real, fixed-size pages — the one-click escape hatch for
 * "continuous-flow has no WYSIWYG pages on screen". This is what validates the
 * core risk: screen-good vs print-good.
 */
export function PagePreview({
  sections,
  design,
}: {
  sections: Section[];
  design: DesignSystem;
}) {
  const ref = useRef<HTMLDivElement>(null);
  const [status, setStatus] = useState<'rendering' | 'done' | 'error'>('rendering');
  const [pages, setPages] = useState(0);

  useEffect(() => {
    const target = ref.current;
    if (!target) return;
    let cancelled = false;

    // paged.js appends pages to the DOM directly (not via setState), so a
    // StrictMode double-invoke would render two copies. Defer the actual run to
    // a timer that the cleanup cancels, so only the surviving effect renders.
    const timer = setTimeout(() => {
      if (cancelled) return;
      target.innerHTML = '';
      setStatus('rendering');

      const html = renderToStaticMarkup(
        <DocSurface design={design}>
          <DocBody sections={sections} />
        </DocSurface>,
      );
      const blob = new Blob([docCss], { type: 'text/css' });
      const url = URL.createObjectURL(blob);

      new Previewer()
        .preview(html, [url], target)
        .then((flow) => {
          if (cancelled) return;
          setPages(flow.total);
          setStatus('done');
        })
        .catch((err) => {
          if (cancelled) return;
          console.error('[opendoc] paged.js preview failed', err);
          setStatus('error');
        })
        .finally(() => URL.revokeObjectURL(url));
    }, 0);

    return () => {
      cancelled = true;
      clearTimeout(timer);
    };
  }, [sections, design]);

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
