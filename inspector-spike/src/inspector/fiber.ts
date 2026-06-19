/**
 * Source resolution via injected `data-odc-loc` tags, read through the React
 * fiber chain.
 *
 * Walk up from the clicked DOM node and return the FIRST fiber whose props carry
 * a `data-odc-loc` (injected by the loc-tags Vite plugin onto every JSX element
 * authored under docs/). This generalizes open-slide's hardcoded
 * `/slides/${id}/index.tsx` needle — it resolves to whatever file the author
 * actually wrote the element in (PLAN §4.3 / Risk #2), and it crosses component
 * boundaries: a host `<p>` rendered by <Prose> has no tag, but the <Prose>
 * component fiber's `memoizedProps['data-odc-loc']` does.
 *
 * We read the tag from PROPS (not the DOM attribute) so it works even when the
 * component never forwards the attribute to a DOM node. Positions come from the
 * on-disk parse, so the write-back middleware matches them exactly — unlike
 * React's `_debugSource`, whose line numbers drift from the source file.
 */

export interface DocSource {
  /** Path relative to project root, e.g. "docs/report/sections/cover.tsx". */
  rel: string;
  line: number;
  column: number;
  /** The component/host tag the resolved fiber represents. */
  tag: string;
}

type Fiber = {
  return: Fiber | null;
  type: unknown;
  memoizedProps?: Record<string, unknown> | null;
  _debugSource?: unknown;
};

function getFiber(node: Element): Fiber | null {
  for (const key of Object.keys(node)) {
    if (key.startsWith('__reactFiber$') || key.startsWith('__reactInternalInstance$')) {
      return (node as unknown as Record<string, Fiber>)[key];
    }
  }
  return null;
}

function tagOf(fiber: Fiber): string {
  if (typeof fiber.type === 'string') return fiber.type;
  const t = fiber.type as { displayName?: string; name?: string } | null;
  return t?.displayName || t?.name || 'Component';
}

function parseLoc(raw: string, tag: string): DocSource | null {
  // "rel/path.tsx:line:col" — rel may itself contain colons on Windows? No (posix here).
  const m = /^(.*):(\d+):(\d+)$/.exec(raw);
  if (!m) return null;
  return { rel: m[1], line: Number(m[2]), column: Number(m[3]), tag };
}

export function findDocSource(node: Element): DocSource | null {
  let fiber = getFiber(node);
  while (fiber) {
    const loc = fiber.memoizedProps?.['data-odc-loc'];
    if (typeof loc === 'string') {
      const parsed = parseLoc(loc, tagOf(fiber));
      if (parsed) return parsed;
    }
    fiber = fiber.return;
  }
  return null;
}

/** Sanity check: did the loc-tags plugin inject anything reachable from here? */
export function locTagsAvailable(node: Element): boolean {
  let f: Fiber | null = getFiber(node);
  while (f) {
    if (typeof f.memoizedProps?.['data-odc-loc'] === 'string') return true;
    f = f.return;
  }
  return false;
}
