import { useEffect, useState } from 'react';

/**
 * Heading-derived table of contents with IntersectionObserver scroll-spy —
 * the document analog of open-slide's thumbnail rail / overview grid. It scans
 * the rendered reading column for headings with ids (set by the Heading
 * primitive) and tracks which one is currently in view.
 */
type Entry = { id: string; text: string; level: number };

export function Toc() {
  const [entries, setEntries] = useState<Entry[]>([]);
  const [active, setActive] = useState<string>('');

  useEffect(() => {
    const root = document.querySelector('.odc-reading');
    if (!root) return;
    const nodes = Array.from(root.querySelectorAll<HTMLElement>('h1[id], h2[id], h3[id]'));
    setEntries(
      nodes.map((n) => ({ id: n.id, text: n.textContent ?? '', level: Number(n.tagName[1]) })),
    );
    if (nodes.length) setActive(nodes[0].id);

    // Mark the heading nearest the top of the viewport as active.
    const visible = new Map<string, number>();
    const io = new IntersectionObserver(
      (records) => {
        for (const r of records) {
          if (r.isIntersecting) visible.set(r.target.id, r.boundingClientRect.top);
          else visible.delete(r.target.id);
        }
        if (visible.size) {
          const top = [...visible.entries()].sort((a, b) => a[1] - b[1])[0][0];
          setActive(top);
        }
      },
      { rootMargin: '0px 0px -70% 0px', threshold: 0 },
    );
    for (const n of nodes) io.observe(n);
    return () => io.disconnect();
  }, []);

  return (
    <nav className="odc-toc" aria-label="Table of contents">
      <p className="odc-toc-title">Contents</p>
      {entries.map((e) => (
        <a
          key={e.id}
          href={`#${e.id}`}
          data-level={e.level}
          className={e.id === active ? 'is-active' : undefined}
          onClick={(ev) => {
            ev.preventDefault();
            document.getElementById(e.id)?.scrollIntoView({ behavior: 'smooth', block: 'start' });
          }}
        >
          {e.text}
        </a>
      ))}
    </nav>
  );
}
