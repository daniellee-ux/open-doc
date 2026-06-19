import type { CSSProperties, ReactNode } from 'react';

/**
 * Doc primitive kit — the component vocabulary agents author with (PLAN §3).
 * Break behavior is baked into the primitives by default (figures/callouts/
 * tables get `break-inside: avoid`) so authors don't hand-tune pagination.
 *
 * The text primitives accept optional `style` / `className` and forward them, so
 * the inspector's style edits (which add `style={{…}}` to the author's <Prose>
 * usage) reach the DOM through the component boundary (PLAN §4.3, M3).
 */

type Styleable = { style?: CSSProperties; className?: string };

function cn(base: string, extra?: string): string {
  return extra ? `${base} ${extra}` : base;
}

function slug(text: string): string {
  return text
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/(^-|-$)/g, '');
}

export function Heading({
  level = 2,
  id,
  children,
  style,
  className,
}: {
  level?: 1 | 2 | 3 | 4;
  id?: string;
  children: ReactNode;
} & Styleable) {
  const Tag = `h${level}` as 'h1' | 'h2' | 'h3' | 'h4';
  const autoId = id ?? (typeof children === 'string' ? slug(children) : undefined);
  return (
    <Tag id={autoId} className={cn(`odc-h${level}`, className)} style={style}>
      {children}
    </Tag>
  );
}

export function Lead({ children, style, className }: { children: ReactNode } & Styleable) {
  return (
    <p className={cn('odc-lead', className)} style={style}>
      {children}
    </p>
  );
}

export function Prose({ children, style, className }: { children: ReactNode } & Styleable) {
  return (
    <p className={cn('odc-prose', className)} style={style}>
      {children}
    </p>
  );
}

export function List({ children, ordered }: { children: ReactNode; ordered?: boolean }) {
  const Tag = ordered ? 'ol' : 'ul';
  return <Tag className="odc-list">{children}</Tag>;
}

export function Figure({ children, caption }: { children: ReactNode; caption?: ReactNode }) {
  return (
    <figure className="odc-figure">
      {children}
      {caption ? <figcaption className="odc-figcaption">{caption}</figcaption> : null}
    </figure>
  );
}

export function Callout({
  kind = 'note',
  title,
  children,
}: {
  kind?: 'note' | 'tip' | 'warn';
  title?: string;
  children: ReactNode;
}) {
  const label = title ?? { note: 'Note', tip: 'Tip', warn: 'Warning' }[kind];
  return (
    <aside className={`odc-callout odc-callout--${kind}`}>
      <div className="odc-callout-title">{label}</div>
      <div>{children}</div>
    </aside>
  );
}

export function Table({ head, children }: { head: ReactNode; children: ReactNode }) {
  return (
    <div className="odc-table-wrap">
      <table className="odc-table">
        <thead>{head}</thead>
        <tbody>{children}</tbody>
      </table>
    </div>
  );
}

export function KeepTogether({ children }: { children: ReactNode }) {
  return <div className="odc-keep-together">{children}</div>;
}

export function PageBreak() {
  return <div className="odc-pagebreak" aria-hidden />;
}

/**
 * Footnotes. `n` is optional: when omitted, DocBody auto-numbers refs and notes
 * sequentially in reading order across ALL sections (PLAN §6 / §9 — cross-section
 * numbering). Authors can still pass an explicit `n` to pin a number.
 */
export function FootnoteRef({ n }: { n?: number }) {
  return (
    <sup className="odc-footref" data-odc-footref id={n ? `fnref-${n}` : undefined}>
      {n ?? ''}
    </sup>
  );
}

export function Footnote({ n, children }: { n?: number; children: ReactNode }) {
  return (
    <div className="odc-footnote" data-odc-footnote id={n ? `fn-${n}` : undefined}>
      <span className="odc-footnote-n">{n ?? ''}</span>
      <span>{children}</span>
    </div>
  );
}
