/**
 * Source resolution via injected `data-odc-loc` tags, read through the React
 * fiber chain (validated in inspector-spike; PLAN §11). Walk up from the clicked
 * DOM node and return the first fiber whose props carry a `data-odc-loc` — the
 * nearest JSX authored under docs/, in whatever file. Reading from PROPS (not
 * the DOM, not `_debugSource`) is what makes it cross-component and cross-file.
 */

export interface DocSource {
  rel: string;
  line: number;
  column: number;
  tag: string;
}

type Fiber = {
  return: Fiber | null;
  type: unknown;
  memoizedProps?: Record<string, unknown> | null;
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

export function findDocSource(node: Element): DocSource | null {
  let fiber = getFiber(node);
  while (fiber) {
    const loc = fiber.memoizedProps?.['data-odc-loc'];
    if (typeof loc === 'string') {
      const m = /^(.*):(\d+):(\d+)$/.exec(loc);
      if (m) return { rel: m[1], line: Number(m[2]), column: Number(m[3]), tag: tagOf(fiber) };
    }
    fiber = fiber.return;
  }
  return null;
}
