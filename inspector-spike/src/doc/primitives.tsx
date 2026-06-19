import type { ReactNode } from 'react';

/**
 * Framework primitives — deliberately defined OUTSIDE docs/ (mirrors
 * `@opendoc/core`). The host elements they render (<p>, <h2>, …) therefore have
 * a `_debugSource` pointing HERE, not at the document. The inspector must climb
 * PAST these frames to the author's `<Prose>` / `<Heading>` usage in the doc
 * file — which is exactly the cross-boundary case the spike validates.
 */

export function Heading({
  level = 2,
  children,
}: {
  level?: 1 | 2 | 3 | 4;
  children: ReactNode;
}) {
  const Tag = `h${level}` as 'h1' | 'h2' | 'h3' | 'h4';
  return <Tag className={`odc-h${level}`}>{children}</Tag>;
}

export function Lead({ children }: { children: ReactNode }) {
  return <p className="odc-lead">{children}</p>;
}

export function Prose({ children }: { children: ReactNode }) {
  return <p className="odc-prose">{children}</p>;
}

export function Callout({ title, children }: { title?: string; children: ReactNode }) {
  return (
    <aside className="odc-callout">
      {title ? <div className="odc-callout-title">{title}</div> : null}
      <div>{children}</div>
    </aside>
  );
}

export function Figure({ children, caption }: { children: ReactNode; caption?: ReactNode }) {
  return (
    <figure className="odc-figure">
      {children}
      {caption ? <figcaption className="odc-figcaption">{caption}</figcaption> : null}
    </figure>
  );
}
