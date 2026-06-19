import { createContext, useContext, type ReactNode } from 'react';

/**
 * The document analog of open-slide's page-context. On screen "current section"
 * is driven by scroll-spy (see Toc); real *page* numbers exist only in print via
 * CSS `counter(page)`. This context just exposes a section's ordinal position.
 *
 * open-slide keys this on globalThis to survive the dev-src/dist dual-module
 * identity hazard; the spike is single-module so a plain context is enough, but
 * the production port must preserve the globalThis-keyed pattern (PLAN §9.6).
 */
type SectionInfo = { index: number; total: number };

const SectionContext = createContext<SectionInfo>({ index: 0, total: 1 });

export function SectionProvider({
  index,
  total,
  children,
}: SectionInfo & { children: ReactNode }) {
  return <SectionContext.Provider value={{ index, total }}>{children}</SectionContext.Provider>;
}

/** Returns the 1-based ordinal of the current section and the total count. */
export function useSectionNumber(): { current: number; total: number } {
  const { index, total } = useContext(SectionContext);
  return { current: index + 1, total };
}
