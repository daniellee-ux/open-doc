import { useCallback, useEffect, useRef, useState } from 'react';
import { type DocSource, findDocSource } from '../lib/fiber';

/**
 * Click-to-source inspector overlay (PLAN §11 + M3). Resolves the clicked
 * element via injected data-odc-loc on the fiber chain, frames it under scroll
 * (fixed positioning + capture-phase scroll), and offers three actions wired to
 * the dev edit engine: edit text, quick style (bold/color/size), and leave a
 * `@doc-comment`. An always-visible bar exposes undo/redo.
 */
const BLOCK_SELECTOR =
  'h1,h2,h3,h4,p,li,figure,figcaption,aside,blockquote,table,th,td,[data-odc-block]';

type Target = { el: HTMLElement; rect: DOMRect; src: DocSource | null };
type Toast = { kind: 'ok' | 'err'; msg: string };

function measure(el: HTMLElement, src: DocSource | null): Target {
  return { el, rect: el.getBoundingClientRect(), src };
}

async function post(url: string, body?: unknown): Promise<any> {
  const res = await fetch(url, {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: body ? JSON.stringify(body) : undefined,
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(data.error ?? `HTTP ${res.status}`);
  return data;
}

export function Inspector({ active }: { active: boolean }) {
  const [hover, setHover] = useState<Target | null>(null);
  const [selected, setSelected] = useState<Target | null>(null);
  const [text, setText] = useState('');
  const [comment, setComment] = useState('');
  const [toast, setToast] = useState<Toast | null>(null);
  const raf = useRef(0);
  const toastTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const flash = useCallback((t: Toast) => {
    setToast(t);
    if (toastTimer.current) clearTimeout(toastTimer.current);
    toastTimer.current = setTimeout(() => setToast(null), 2600);
  }, []);

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
      return;
    }
    const root = document.querySelector<HTMLElement>('.odc-doc-root');
    if (!root) return;

    const onMove = (e: MouseEvent) => {
      const el = (e.target as HTMLElement | null)?.closest<HTMLElement>(BLOCK_SELECTOR);
      if (!el || !root.contains(el)) return setHover(null);
      setHover(measure(el, findDocSource(el)));
    };
    const onLeave = () => setHover(null);
    const onClick = (e: MouseEvent) => {
      const el = (e.target as HTMLElement | null)?.closest<HTMLElement>(BLOCK_SELECTOR);
      if (!el || !root.contains(el)) return;
      e.preventDefault();
      e.stopPropagation();
      setSelected(measure(el, findDocSource(el)));
      setText((el.textContent ?? '').replace(/\s+/g, ' ').trim());
      setComment('');
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
  }, [active, reflow]);

  const editBase = useCallback(() => {
    if (!selected?.src) return null;
    return { rel: selected.src.rel, line: selected.src.line, column: selected.src.column };
  }, [selected]);

  const runEdit = useCallback(
    async (op: 'text' | 'style', payload: unknown, label: string) => {
      const base = editBase();
      if (!base) return;
      try {
        await post('/__odc/edit', { ...base, op, payload });
        flash({ kind: 'ok', msg: `${label} → ${selected?.src?.rel}:${selected?.src?.line}` });
        setSelected(null);
      } catch (err) {
        flash({ kind: 'err', msg: String((err as Error).message ?? err) });
      }
    },
    [editBase, flash, selected],
  );

  const runComment = useCallback(async () => {
    const base = editBase();
    if (!base || !comment.trim()) return;
    try {
      const data = await post('/__odc/comment', { ...base, text: comment.trim() });
      flash({ kind: 'ok', msg: `Comment → ${data.rel}:${data.line}` });
      setSelected(null);
    } catch (err) {
      flash({ kind: 'err', msg: String((err as Error).message ?? err) });
    }
  }, [editBase, comment, flash]);

  const toggleBold = useCallback(() => {
    if (!selected) return;
    const w = Number.parseInt(getComputedStyle(selected.el).fontWeight, 10) || 400;
    runEdit('style', { props: { fontWeight: w >= 600 ? '400' : '700' } }, 'Bold');
  }, [selected, runEdit]);

  const bumpSize = useCallback(
    (delta: number) => {
      if (!selected) return;
      const px = Number.parseFloat(getComputedStyle(selected.el).fontSize) || 16;
      runEdit('style', { props: { fontSize: `${Math.max(8, Math.round(px + delta))}px` } }, 'Font size');
    },
    [selected, runEdit],
  );

  const setColor = useCallback(
    (color: string) => runEdit('style', { props: { color } }, 'Color'),
    [runEdit],
  );

  const history = useCallback(
    async (dir: 'undo' | 'redo') => {
      try {
        const data = await post(`/__odc/${dir}`);
        flash(
          data.empty
            ? { kind: 'err', msg: `Nothing to ${dir}` }
            : { kind: 'ok', msg: `${dir === 'undo' ? 'Undid' : 'Redid'} → ${data.file}` },
        );
        setSelected(null);
      } catch (err) {
        flash({ kind: 'err', msg: String((err as Error).message ?? err) });
      }
    },
    [flash],
  );

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
                    {selected.src.rel}:{selected.src.line}
                  </span>
                </>
              ) : (
                <span className="odc-pop-loc odc-pop-loc--miss">no doc source resolved</span>
              )}
            </div>

            <label className="odc-pop-label">Text</label>
            <textarea
              className="odc-pop-text"
              value={text}
              onChange={(e) => setText(e.target.value)}
              onKeyDown={(e) => {
                if ((e.metaKey || e.ctrlKey) && e.key === 'Enter') runEdit('text', { text }, 'Text');
              }}
            />
            <div className="odc-pop-actions">
              <div className="odc-style-row">
                <button type="button" className="odc-chip" title="Bold" onClick={toggleBold}>
                  <b>B</b>
                </button>
                <button type="button" className="odc-chip" title="Smaller" onClick={() => bumpSize(-2)}>
                  A−
                </button>
                <button type="button" className="odc-chip" title="Bigger" onClick={() => bumpSize(2)}>
                  A+
                </button>
                <input
                  type="color"
                  className="odc-color"
                  title="Text color"
                  onChange={(e) => setColor(e.target.value)}
                />
              </div>
              <button
                type="button"
                className="odc-pop-btn odc-pop-btn--primary"
                disabled={!selected.src}
                onClick={() => runEdit('text', { text }, 'Text')}
              >
                Save text
              </button>
            </div>

            <label className="odc-pop-label">Comment for the agent</label>
            <textarea
              className="odc-pop-text"
              value={comment}
              placeholder="e.g. “tighten this paragraph”"
              onChange={(e) => setComment(e.target.value)}
              onKeyDown={(e) => {
                if ((e.metaKey || e.ctrlKey) && e.key === 'Enter') runComment();
              }}
            />
            <div className="odc-pop-actions">
              <button type="button" className="odc-pop-btn" onClick={() => setSelected(null)}>
                Close
              </button>
              <button
                type="button"
                className="odc-pop-btn"
                disabled={!selected.src || !comment.trim()}
                onClick={runComment}
              >
                Add comment
              </button>
            </div>
          </Popover>
        </>
      ) : null}

      <div className="odc-inspect-bar">
        <span className="odc-inspect-hint">Click any block to edit</span>
        <button type="button" className="odc-chip" onClick={() => history('undo')}>
          ↶ Undo
        </button>
        <button type="button" className="odc-chip" onClick={() => history('redo')}>
          ↷ Redo
        </button>
      </div>

      {toast ? <div className={`odc-toast odc-toast--${toast.kind}`}>{toast.msg}</div> : null}
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
  const top = Math.min(rect.bottom + 8, window.innerHeight - 340);
  const left = Math.min(Math.max(rect.left, 12), window.innerWidth - 332);
  return (
    <div className="odc-pop" style={{ top, left }}>
      {children}
    </div>
  );
}
