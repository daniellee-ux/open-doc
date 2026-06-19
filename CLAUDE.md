# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## What this is

Opendoc is the agent-native document framework — the document analog of [open-slide](https://github.com/1weiho/open-slide). Authors write long-form documents as React components; the framework owns layout, theming, the table of contents, and print-fidelity PDF/export. The whole authoring contract: a document is a folder `docs/<id>/index.tsx` whose **default export is an array of section components, and array order is reading order**. Section metadata lives as static props on the component (`Cover.id = 'cover'`), mirroring open-slide's `Page.transition`.

All milestones M0–M6 are implemented. See `README.md` for the feature overview, and the `prototype/` and `inspector-spike/` directories for the validation spikes that de-risked the rendering model and the click-to-source inspector.

## Commands

```bash
npm install              # repo root — npm workspaces
npm run dev              # opendoc dev for apps/demo → http://localhost:5173
npm run build            # static build of apps/demo → apps/demo/dist
npm run typecheck        # tsc --noEmit on @opendoc/core — the ONLY automated check
```

There is **no test suite, linter, or formatter** configured. `npm run typecheck` is the verification gate; run it after editing `packages/core`. Dev/build changes are verified by running the app (the `verify`/`run` skills, or manual browser checks against the demo docs).

The `opendoc` CLI (`packages/core/bin/opendoc.mjs`) runs the TypeScript source **directly via `tsx` — there is no build step for the framework itself.** Commands: `opendoc <dev|build|preview|sync>` (no arg = dev). Run it inside a workspace (a dir with `docs/` and optional `opendoc.config.ts`), e.g. `cd apps/demo && opendoc dev`.

## Repo layout

npm workspaces = `packages/*` + `apps/*` only:
- **`packages/core`** (`@opendoc/core`) — the entire framework: runtime SPA, Vite plugins, CLI, primitives, design system, and bundled agent skills.
- **`apps/demo`** (`@opendoc/demo`) — a sample *workspace* (not framework code): `docs/*` content + `opendoc.config.ts`. Its scripts just call `opendoc`.

`prototype/` and `inspector-spike/` are **standalone validation spikes, NOT workspaces** (own `node_modules`/`package-lock.json`). They are throwaway proofs referenced by PLAN §10–11 — don't treat them as part of the build.

## Architecture

### Two layers, sharply separated
1. **Framework** (`packages/core/src`) — edit this to change how documents render, export, or are inspected.
2. **Content** (`<workspace>/docs/<id>/index.tsx`) — authored documents. The bundled agent skills (`create-doc`, `doc-authoring`, `apply-comments`, `current-doc`, `create-theme`) are for authoring *content only*, never for changing the framework.

### The Vite config is built in code, not from a file
`packages/core/src/vite/config.ts:createViteConfig` returns an `InlineConfig` with `configFile: false`. Critically, **`root` is the SPA shipped inside the package (`src/app`), not the user's cwd.** The user's `docs/` are pulled in through virtual modules, not by serving their directory. Plugin order matters and is intentional:

```
locTagsPlugin (enforce:'pre') → react() → opendocPlugin → inspectorApiPlugin → currentPlugin → assetsPlugin
```

### Discovery via virtual modules (`vite/opendoc-plugin.ts`)
- `virtual:opendoc/docs` — globs `docs/<id>/index.{tsx,jsx,ts,js}` into `docIds` + a `loadDoc(id)` dynamic-import switch.
- `virtual:opendoc/config` — resolved `OpendocConfig` (docsDir, page geometry, build flags).
- HMR: **editing** a doc file fires a custom `opendoc:doc-changed` event and bumps an import token to re-import *without a full reload* (preserves inspector/UI state). **Adding/removing** a doc invalidates the virtual module and does a full reload.

### Rendering: continuous flow, no canvas
`DocBody` concatenates all sections into one flow; `DocSurface` is the single `[data-odc-doc]` theming root carrying `--odc-*` CSS variables at a fixed measure. **No `transform: scale()`, no per-slide canvas** (the key departure from open-slide). Pages exist only at export time: `PagePreview` uses paged.js; Print/Save-PDF uses `window.print()` with `@page` rules in `app/doc.css`.

### Inspector — click-to-source edits (dev only)
The crown jewel (PLAN §4.3, §11). Three pieces work together:
- **`vite/loc-tags-plugin.ts`** (`enforce:'pre'`) parses the *original* source with `@babel/parser` and injects `data-odc-loc="rel:line:col"` onto every JSX opening element under `docs/`. It deliberately does **NOT** use React's `_debugSource` (those line numbers reflect post-transform positions and drift from disk).
- **`app/lib/fiber.ts`** walks up the React fiber chain from the clicked DOM node and reads `data-odc-loc` off `memoizedProps` — reading from **props, not the DOM**, is what makes resolution work *across component boundaries and files* (a host `<p>` rendered by `<Prose>` has no tag, but the `<Prose>` fiber's props do).
- **`vite/inspector-api.ts`** (dev middleware) applies edits by **byte-stable string-splice on source** (no codegen → surgical HMR), with an in-memory undo/redo history. Routes: `POST /__odc/{comment,edit,undo,redo}`.

Because edits land via `style={{…}}` on the author's primitive usage, the text primitives in `primitives.tsx` **forward `style`/`className`** so those edits reach the DOM through the component boundary.

### Current-cursor + assets
- `vite/current-plugin.ts` listens on the HMR socket for `opendoc:current` and atomically writes `.opendoc/current.json` (doc id, active heading anchor, scroll, view). This is the data source for the `current-doc` skill. The file is gitignored.
- `vite/assets-plugin.ts` exposes `GET /__odc/assets?doc=<id>` listing `docs/<id>/assets/` (read-only).

### Export (`app/lib/export.ts`)
HTML / Markdown / DOCX are generated **client-side from a single mounted `Section[]` tree** via `renderToStaticMarkup` — not per-section captures — so cross-section structure and numbering survive. In dev, builders are also exposed on `window.__odc` for automation.

### Design system (`design.ts`)
`DesignSystem` → `designToCssVars` emits `--odc-*` variables. `resolveDesign` precedence: explicit `design` export > `meta.theme` preset > `defaultDesign`. Built-in presets: `editorial` (default), `technical`, `manuscript`, browsable at `/themes`.

## Conventions & gotchas

- **`meta.createdAt` must be a quoted ISO 8601 string literal** — a build-time regex scrapes it from source.
- Section anchor/break/toc config is set as **static props** on the component (`Section.id`, `.breakBefore`, `.breakAvoid`, `.toc`), not via JSX props.
- Dev-only features (Inspector, Assets, `window.__odc`) are gated on `import.meta.env.DEV`; `__OPENDOC_COMMAND__` is defined as `serve`/`build`.
- `react`/`react-dom` are deduped in the Vite config — the SPA and the user's doc components must share one React instance.
- Public API surface is `packages/core/src/index.ts` (what docs import from `@opendoc/core`) and `./vite` (the plugin). The doc-module contract lives in `sdk.ts`.
- Agent skills are bundled under `packages/core/skills/` and copied into a workspace's `.claude/skills/` by `opendoc sync` — edit the source under `packages/core/skills/`, not the synced copies.
