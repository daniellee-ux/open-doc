# Opendoc — renderer prototype

A self-contained spike that validates the **continuous-flow** rendering model — before committing
to the full port of open-slide. It is **not**
the framework; it deliberately skips the Vite discovery plugin, virtual modules, inspector, and
CLI. It imports one sample document directly and proves the part that was actually uncertain:
*does a flowing document also paginate well?*

## Run

```bash
cd prototype
npm install
npm run dev      # http://localhost:5179
```

- **Reading view** — the document as one continuous, themed, scrolling column (no `transform:
  scale()`; real selectable text).
- **Page preview** (toolbar) — runs **paged.js** over the same `Section[]` tree to fragment it
  into real fixed-size pages, with `@page` margins and page numbers. This is the WYSIWYG escape
  hatch and the honest test of "screen-good vs print-good".
- **Print / Save PDF** (toolbar) — `window.print()`; the same `@page` + `break-*` rules drive the
  browser's own pagination. Choose "Save as PDF" to get the artifact.

## What it proves

| Claim | Where to look |
| --- | --- |
| `export default [Section, …]` contract, metadata as static props | [`docs/quarterly-report/index.tsx`](docs/quarterly-report/index.tsx) |
| `DocSurface` carries `[data-odc-doc]` theming root, no scale | [`src/components/DocSurface.tsx`](src/components/DocSurface.tsx) |
| `DocBody` mounts all sections concatenated, reads `breakBefore` off the component | [`src/components/DocBody.tsx`](src/components/DocBody.tsx) |
| Doc primitive kit with break rules baked in | [`src/primitives.tsx`](src/primitives.tsx) + [`src/doc.css`](src/doc.css) |
| Heading-derived TOC with IntersectionObserver scroll-spy | [`src/components/Toc.tsx`](src/components/Toc.tsx) |
| `--odc-*` document type scale (body-oriented, not hero=168) | [`src/design.ts`](src/design.ts) |
| CSS Paged-Media pagination, two ways | [`src/doc.css`](src/doc.css) `@page`, [`src/components/PagePreview.tsx`](src/components/PagePreview.tsx) |
| `break-inside: avoid` keeps figures/tables/callouts whole | scroll to Figure 1 / the table, then open Page preview |
| Forced section break (`breakBefore`) | the "Appendix" section starts a new page |

## What it intentionally does NOT cover

The inspector / click-to-source engine, the Vite glob → `virtual:opendoc/docs` discovery, the
CLI, footnote cross-section numbering, and running headers from `string-set` (paged.js supports
it; the spike keeps `@page` modest). Those are later framework milestones (M1 / M3 / M6).
