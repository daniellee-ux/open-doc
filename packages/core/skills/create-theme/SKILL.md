---
name: create-theme
description: Use this skill when the user wants a new visual theme / look for an Opendoc document — "make a theme", "restyle this", "give it a technical look", "change the fonts and colors". Covers choosing a built-in theme, tuning the design tokens, and committing a reusable look.
---

# Theme an Opendoc document

A theme is a `DesignSystem` — a palette, font pair, type scale, measure, leading, and paragraph spacing — surfaced as `--odc-*` CSS variables on the document root. There are two ways to apply one.

## 1. Use a built-in theme

Set `meta.theme` to a preset id (see them in the `/themes` gallery):

```tsx
export const meta: DocMeta = { title: '…', theme: 'technical', createdAt: '…' };
```

Built-ins: `editorial` (default — serif body, sans headings), `technical` (sans body, mono headings, blue accent), `manuscript` (classic serif, generous leading). `resolveDesign` applies the preset when no explicit `design` is exported.

## 2. Define a custom theme

Export a `design` object from the document (this overrides `meta.theme`):

```tsx
import type { DesignSystem } from '@opendoc/core';

export const design: DesignSystem = {
  palette: { bg: '#fff', fg: '#1c1b19', muted: '#6b6a63', accent: '#b4532a', rule: '#e6e4dc' },
  fonts: { body: "'…' , serif", heading: "ui-sans-serif, system-ui, sans-serif" },
  typeScale: { h1: 2.4, h2: 1.6, h3: 1.25, h4: 1.05, body: 1.0, lead: 1.2, caption: 0.85, footnote: 0.8 },
  measure: '720px',   // reading column width
  leading: 1.62,      // body line-height
  paraSpacing: '1.05em',
};
```

## Rules for a good theme

- **One body font + one heading font.** Pair a serif body with a sans heading (or commit fully to one).
- **Measure 640–760px.** Wider than ~760px hurts readability for running prose.
- **Type scale is a hierarchy, not decoration.** Keep h1 ≈ 2–2.5rem, body = 1rem; don't inflate headings.
- **Leading 1.5–1.8** for body. Tighter reads cramped; looser loses cohesion.
- **One accent color.** Used for links, the running header rule, callout borders — not for body text.
- Verify in **Page preview** that the type scale paginates cleanly.

To make a theme reusable across documents, factor the `design` object into a shared module under `docs/_shared/` and import it from each document's `index.tsx`.
