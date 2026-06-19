---
name: doc-authoring
description: Technical reference for writing or editing Opendoc documents — the file contract, the continuous-flow model, the primitive kit, the design tokens, and the print/pagination rules. Consult this whenever you are about to write or modify any file under `docs/<id>/`, including from inside the `create-doc` or `apply-comments` workflows, or for any ad-hoc edit. Triggers on "edit doc", "tweak this section", "fix the layout", "change the type", "how do docs work here".
---

# Authoring Opendoc documents

This is the **technical reference** for everything under `docs/<id>/`. It owns no workflow — `create-doc` owns "draft a new document", `apply-comments` owns "process inspector markers", `current-doc` resolves "this page" to a concrete doc. When any of those reach the point of *writing React for a document*, this is the source of truth.

## The model: continuous flow

A document is **not** a deck of fixed-size pages. It is one continuous, themeable reading column. You write prose and structure; the framework owns layout, the table of contents, and pagination. **Pages exist only at export** (PDF / print), produced by CSS Paged Media — you never lay out a page by hand.

The single most important rule: **there is no vertical budget.** Never size content to fit a page; never insert breaks to "make it fit". Write the content; let it flow.

## File contract

```tsx
// docs/<id>/index.tsx
import { Heading, Lead, Prose, type Section, type DocMeta } from '@opendoc/core';

const Intro: Section = () => (
  <>
    <Heading level={1}>Title</Heading>
    <Lead>One-sentence standfirst.</Lead>
    <Prose>Body paragraph…</Prose>
  </>
);
Intro.id = 'intro';

export const meta: DocMeta = { title: 'My document', createdAt: '2026-06-19T12:00:00Z' };
export default [Intro] satisfies Section[];
```

- `export default` is a **non-empty array of zero-prop React components** (`Section[]`), one per section, in reading order.
- Section metadata is set as **static properties** on the component:
  - `Section.id` — stable anchor for the TOC + deep links. Always set it.
  - `Section.breakBefore = true` — force a print page break before this section (new chapter). Use sparingly, only for *semantic* breaks.
  - `Section.breakAvoid = true` — keep the whole section together when paginating.
  - `Section.toc = { title, level }` — explicit outline entry (headings are auto-collected otherwise).
- `meta.title` shows in the header and becomes the running header in PDF. `meta.createdAt` is a **quoted ISO 8601 string** — run `node -e "console.log(new Date().toISOString())"` and paste the output; never type it from memory, and never use `new Date(...)` in the file (it's scraped by regex at build time).
- Optional: `export const design: DesignSystem` (theme tokens) and `export const page: PageSize` (`{ size: 'Letter' | 'A4', margin, orientation }`).

### Multiple files are fine

Long documents may split sections into sibling files imported by `index.tsx`:

```tsx
import { Cover } from './sections/cover';
import { Findings } from './sections/findings';
export default [Cover, Findings] satisfies Section[];
```

The inspector resolves click-to-source across these files correctly (it reads injected `data-odc-loc` off the fiber chain). Keep shared, document-specific components **under `docs/<id>/`** so they're inspectable.

## Primitive kit (import from `@opendoc/core`)

| Component | Use |
| --- | --- |
| `<Heading level={1..4}>` | Headings. Exactly one `level={1}` per major section; never skip levels. Auto-registers in the TOC. |
| `<Lead>` | Opening / standfirst paragraph. |
| `<Prose>` | Body paragraphs. One idea per paragraph. |
| `<List ordered?>` | Bulleted / numbered lists. |
| `<Figure caption>` | Image/diagram + caption. Kept whole across page breaks by default. Images are `width:100%`. |
| `<Callout kind title>` | `note` / `tip` / `warn` box. Kept whole by default. |
| `<Table head>` | Tabular data; header repeats on print pages; rows don't split. |
| `<Footnote n>` / `<FootnoteRef n>` | Footnotes — never hand-roll superscripts. |
| `<PageBreak/>` / `<KeepTogether>` | Explicit pagination control for print. |

`Heading`, `Lead`, `Prose`, `Callout` accept optional `style` / `className`.

## Authoring rules

- **Prose flow, not boxes.** Author paragraphs; don't size to a page. Length is free.
- **Heading hierarchy is strict.** One `<Heading level={1}>` per major section; never jump levels (h1→h3 is a bug). Give every section a stable `id`.
- **Measure.** Body text lives within `--odc-measure` (~66ch). Don't widen running prose past it; use `<Columns>`/full-bleed only for figures/tables.
- **Figures.** Always `<Figure caption=…>`. Reference figures by name in the text ("see Figure 3"); don't rely on adjacency. Images `width:100%; height:auto`, never fixed px.
- **Page-break discipline.** `breakBefore` / `<PageBreak/>` only for *semantic* breaks. Wrap must-stay-together content in `<KeepTogether>`. Trust `orphans`/`widows`; don't hand-tune. **Verify page layout in Page preview** (screen ≠ print).
- **Tables / footnotes** via the primitives, not raw markup.
- **Spacing / leading** come from tokens (`--odc-*`); don't inline line-heights.

## Design tokens

Reference theme values via `var(--odc-*)` in inline styles: `--odc-color-bg/fg/muted/accent/rule`, `--odc-font-body/head`, `--odc-h1..h4`, `--odc-body/lead/caption/footnote`, `--odc-measure`, `--odc-leading`, `--odc-para-gap`. Set a top-level `export const design: DesignSystem` to retheme; values flow to these vars.

## Self-review before finishing

1. `export default` is a non-empty `Section[]`; every section has an `id`.
2. One `level={1}` per major section; no skipped heading levels.
3. Figures/tables use the primitives; images are `width:100%`.
4. `meta.createdAt` is a real quoted ISO string (from `node -e`).
5. No content sized to a page; `breakBefore` only for semantic breaks.
6. Opened **Page preview** to confirm figures/tables/callouts don't strand or split.
