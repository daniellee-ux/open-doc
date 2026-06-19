# Opendoc — inspector spike (spike #2)

De-risks the **crown-jewel feature** before the full port: the in-browser
click-to-source inspector, under the conditions that make documents different
from slides — a *scrolling* viewport and *multi-file* authoring (the inspector's
two hardest porting risks).

## Run

```bash
cd inspector-spike
npm install
npm run dev      # http://localhost:5180
```

Click **Inspect** in the toolbar, then click any block in the document. A frame
appears labeled with the resolved source file:line, and a popover lets you write
a comment that is persisted as a `@doc-comment` marker in the *correct source
file*. The sample document is intentionally split across files:

```
docs/report/index.tsx              → [Cover, Findings]
docs/report/sections/cover.tsx     → Cover section
docs/report/sections/findings.tsx  → Findings section (uses HeadingBlock)
src/doc/HeadingBlock.tsx           → a component defined OUTSIDE docs/
```

## What it proves

| Unknown (from the plan) | Result |
| --- | --- |
| Click-to-source resolves to the right **file** in a multi-file doc | ✅ cover blocks → `cover.tsx`, findings blocks → `findings.tsx` |
| Resolution crosses **component boundaries** (Risk #2's worst case) | ✅ `<HeadingBlock>` (defined in `src/doc/`) resolves to its **usage** in `findings.tsx`, not to `HeadingBlock.tsx` |
| The overlay frame stays aligned under **scroll** | ✅ frame tracks the element 1:1 while the inner container scrolls |
| Write-back lands on the **exact** clicked element | ✅ marker inserted as first child of the clicked `<Prose>` / data-attr on a self-closing `<HeadingBlock>` |

## The key finding (and the fix)

The obvious approach — resolve source from React's fiber **`_debugSource`** — is
**unreliable here**: in Vite + @vitejs/plugin-react its line numbers don't match
the on-disk file (they reflect post-transform positions), so the first write-back
landed on the wrong paragraph.

The fix (what open-slide also does, and why): a `enforce: 'pre'` Vite plugin
([`vite/loc-tags.ts`](vite/loc-tags.ts)) parses the **original source** and
injects `data-odc-loc="rel:line:col"` onto every JSX element under `docs/`. The
inspector reads that tag off the **fiber `memoizedProps`** chain
([`src/inspector/fiber.ts`](src/inspector/fiber.ts)) — which:
- gives positions that exactly match what the write-back middleware re-parses, and
- survives component boundaries (a host `<p>` rendered by `<Prose>` has no tag,
  but the `<Prose>` component fiber's props do), which is what makes cross-file,
  cross-component resolution work.

Write-back is a dev-only Vite middleware ([`vite/inspector-api.ts`](vite/inspector-api.ts))
that string-splices the marker into the source (no codegen, so the rest of the
file stays byte-identical and HMR stays surgical).

## Not covered (deliberately)

Applying edits (only comment markers are written), the `apply-comments` agent
loop, undo/redo, asset/crop ops, and the full inspector property panel. Those
port from open-slide's `editing/*` + `inspector/*` largely intact (PLAN §4.3) and
belong in M3 proper.
