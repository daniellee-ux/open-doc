import type { ReactNode } from 'react';
import { type DesignSystem, defaultDesign, designToCssVars } from '../design';

/**
 * Replaces open-slide's `SlideCanvas`. There is NO `transform: scale()` — the
 * document is real, selectable, findable text at 1:1. This element carries the
 * `[data-odc-doc]` theming root (the analog of `[data-osd-canvas]`), so every
 * `var(--odc-*)` consumer resolves against it.
 *
 * INVARIANT (PLAN §4.3): never put a CSS transform on this subtree — it would
 * break the inspector's getBoundingClientRect-based overlay math.
 */
export function DocSurface({
  children,
  design = defaultDesign,
}: {
  children: ReactNode;
  design?: DesignSystem;
}) {
  return (
    <div data-odc-doc className="odc-surface" style={designToCssVars(design)}>
      {children}
    </div>
  );
}
