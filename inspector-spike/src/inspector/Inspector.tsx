import { useCallback, useEffect, useRef, useState } from 'react';
import { type DocSource, findDocSource, locTagsAvailable } from './fiber';

/**
 * Click-to-source inspector overlay. Key differences from open-slide's
 * inspect-overlay.tsx, both validated here:
 *  - It positions with `position: fixed` + viewport `getBoundingClientRect`, and
 *    recomputes on scroll (capture phase, so it catches the inner scroll
 *    container too). open-slide's overlay is `absolute inset-0` inside a
 *    non-scrolling canvas; a flowing doc scrolls, so this is the §4.3 fix.
 *  - Source is resolved via injected data-odc-loc read off the fiber chain
 *    (file-accurate + cross-file; see fiber.ts for why not _debugSource).
 */

const BLOCK_SELECTOR =
  'h1,h2,h3,h4,p,li,figure,figcaption,aside,blockquote,table,th,td,[data-odc-block]';

type Target = { el: HTMLElement; rect: DOMRect; src: DocSource | null };

function measure(el: HTMLElement, src: DocSource | null): Target {
  return { el, rect: el.getBoundingClientRect(), src };
}

export function Inspector({ active }: { active: boolean }) {
  const [hover, setHover] = useState<Target | null>(null);
  const [selected, setSelected] = useState<Target | null>(null);
  const [text, setText] = useState('');
  const [status, setStatus] = useState<{ kind: 'ok' | 'err' | 'info'; msg: string } | null>(null);
  const [locOk, setLocOk] = useState<boolean | null>(null);
  const raf = useRef(0);

  // Recompute frames on scroll/resize so they track the element under scroll.
  const reflow = useCallback(() => {
    cancelAnimationFrame(raf.current);
    raf.current = requestAnimationFrame(() => {
      setHover((h) => (h ? measure(h.el, h.src) : null));
      setSelected((s) => (s ? { ...s, rect: s.el.getBoundingClientRect() } : null));
    });
  }, []);

  useEffect(() => {
    if (!active) {
      setHover(null);
      setSelected(null);
      setStatus(null);
      return;
    }
    const root = document.querySelector<HTMLElement>('.odc-doc-root');
    if (!root) return;

    const onMove = (e: MouseEvent) => {
      const el = (e.target as HTMLElement | null)?.closest<HTMLElement>(BLOCK_SELECTOR);
      if (!el || !root.contains(el)) {
        setHover(null);
        return;
      }
      setHover(measure(el, findDocSource(el)));
    };
    const onLeave = () => setHover(null);
    const onClick = (e: MouseEvent) => {
      const el = (e.target as HTMLElement | null)?.closest<HTMLElement>(BLOCK_SELECTOR);
      if (!el || !root.contains(el)) return;
      e.preventDefault();
      e.stopPropagation();
      if (locOk === null) setLocOk(locTagsAvailable(el));
      setSelected(measure(el, findDocSource(el)));
      setText('');
      setStatus(null);
    };

    root.addEventListener('mousemove', onMove);
    root.addEventListener('mouseleave', onLeave);
    root.addEventListener('click', onClick, true);
    window.addEventListener('scroll', reflow, true);
    window.addEventListener('resize', reflow);
    return () => {
      root.removeEventListener('mousemove', onMove);
      root.removeEventListener('mouseleave', onLeave);
      root.removeEventListener('click', onClick, true);
      window.removeEventListener('scroll', reflow, true);
      window.removeEventListener('resize', reflow);
      cancelAnimationFrame(raf.current);
    };
  }, [active, reflow, locOk]);

  const submit = useCallback(async () => {
    if (!selected?.src || !text.trim()) return;
    setStatus({ kind: 'info', msg: 'Writing marker…' });
    try {
      const res = await fetch('/__odc/comment', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({
          rel: selected.src.rel,
          line: selected.src.line,
          column: selected.src.column,
          text: text.trim(),
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? `HTTP ${res.status}`);
      setStatus({ kind: 'ok', msg: `Wrote @doc-comment to ${data.rel}:${data.line}` });
      setText('');
    } catch (err) {
      setStatus({ kind: 'err', msg: String((err as Error).message ?? err) });
    }
  }, [selected, text]);

  if (!active) return null;

  return (
    <div className="odc-inspector-layer">
      {hover && (!selected || hover.el !== selected.el) ? (
        <Frame rect={hover.rect} src={hover.src} variant="hover" />
      ) : null}
      {selected ? (
        <>
          <Frame rect={selected.rect} src={selected.src} variant="select" />
          <Popover rect={selected.rect}>
            <div className="odc-pop-src">
              {selected.src ? (
                <>
                  <span className="odc-pop-tag">&lt;{selected.src.tag}&gt;</span>
                  <span className="odc-pop-loc">
                    {selected.src.rel}:{selected.src.line}:{selected.src.column}
                  </span>
                </>
              ) : (
                <span className="odc-pop-loc odc-pop-loc--miss">no doc source resolved</span>
              )}
            </div>
            <textarea
              autoFocus
              value={text}
              placeholder="Comment for the agent — e.g. “make this bold”"
              onChange={(e) => setText(e.target.value)}
              onKeyDown={(e) => {
                if ((e.metaKey || e.ctrlKey) && e.key === 'Enter') submit();
              }}
            />
            <div className="odc-pop-actions">
              <button type="button" className="odc-pop-btn" onClick={() => setSelected(null)}>
                Close
              </button>
              <button
                type="button"
                className="odc-pop-btn odc-pop-btn--primary"
                disabled={!selected.src || !text.trim()}
                onClick={submit}
              >
                Add comment
              </button>
            </div>
            {status ? <div className={`odc-pop-status odc-pop-status--${status.kind}`}>{status.msg}</div> : null}
            {locOk === false ? (
              <div className="odc-pop-status odc-pop-status--err">
                ⚠ data-odc-loc missing — loc-tags plugin not applied
              </div>
            ) : null}
          </Popover>
        </>
      ) : null}
    </div>
  );
}

function Frame({
  rect,
  src,
  variant,
}: {
  rect: DOMRect;
  src: DocSource | null;
  variant: 'hover' | 'select';
}) {
  return (
    <div
      className={`odc-frame odc-frame--${variant}`}
      style={{ left: rect.left, top: rect.top, width: rect.width, height: rect.height }}
    >
      {src ? (
        <span className="odc-frame-label">
          {src.rel}:{src.line}
        </span>
      ) : null}
    </div>
  );
}

function Popover({ rect, children }: { rect: DOMRect; children: React.ReactNode }) {
  // Anchor below the element, clamped into the viewport.
  const top = Math.min(rect.bottom + 8, window.innerHeight - 220);
  const left = Math.min(Math.max(rect.left, 12), window.innerWidth - 332);
  return (
    <div className="odc-pop" style={{ top, left }}>
      {children}
    </div>
  );
}
