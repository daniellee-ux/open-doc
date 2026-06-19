import type { ComponentType } from 'react';

/**
 * Minimal continuous-flow renderer (the validated model from spike #1), just
 * enough to host the inspector. Mounts all sections concatenated in a scrolling
 * column — the scroll is what stresses the overlay positioning.
 */
export function DocView({ sections }: { sections: ComponentType[] }) {
  return (
    <div className="odc-doc-root">
      <article className="odc-reading">
        {sections.map((S, i) => (
          <section key={i} className="odc-section">
            <S />
          </section>
        ))}
      </article>
    </div>
  );
}
