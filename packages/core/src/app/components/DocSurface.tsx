import type { ReactNode } from 'react';
import { type DesignSystem, defaultDesign, designToCssVars } from '../../design';

/**
 * Replaces open-slide's `SlideCanvas`. NO `transform: scale()` — real,
 * selectable, findable text at 1:1. Carries the `[data-odc-doc]` theming root
 * (analog of `[data-osd-canvas]`) so every `var(--odc-*)` resolves here.
 * INVARIANT (PLAN §4.3): never apply a CSS transform to this subtree.
 */
export function DocSurface({
  children,
  design = defaultDesign,
  title,
}: {
  children: ReactNode;
  design?: DesignSystem;
  /** Doc title — emitted as a hidden running-title for paged-media headers. */
  title?: string;
}) {
  return (
    <div data-odc-doc className="odc-surface" style={designToCssVars(design)}>
      {title ? (
        <div className="odc-running-title" aria-hidden>
          {title}
        </div>
      ) : null}
      {children}
    </div>
  );
}
