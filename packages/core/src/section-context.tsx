import { type Context, createContext, useContext, type ReactNode } from 'react';

/**
 * The document analog of open-slide's page-context. On screen "current section"
 * is driven by scroll-spy (see Toc); real *page* numbers exist only in print via
 * CSS `counter(page)`.
 *
 * Keyed on globalThis (PLAN §9.6): a document imports `useSectionNumber` via the
 * package specifier `@opendoc/core` while the runtime imports `SectionProvider`
 * relatively, so this module can be evaluated twice. Caching the Context on
 * globalThis guarantees both copies share ONE context object — otherwise the
 * provider and consumer never connect and the hook silently returns defaults.
 */
type SectionInfo = { index: number; total: number };

const KEY = Symbol.for('opendoc.section-context');
const store = globalThis as unknown as Record<symbol, Context<SectionInfo>>;
const SectionContext: Context<SectionInfo> =
  store[KEY] ?? (store[KEY] = createContext<SectionInfo>({ index: 0, total: 1 }));

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
