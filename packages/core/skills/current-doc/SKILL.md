---
name: current-doc
description: Resolves deictic references to the document the user is currently looking at — "this page", "the doc I'm on", "this section", "what I'm viewing" — to a concrete doc id, section, and scroll position. Consult FIRST when the user references the current document without naming it, then hand off to doc-authoring / apply-comments for the actual edit.
---

# Resolve the current document

When the user says "this doc", "the section I'm reading", or "what's on screen", read the live cursor the dev server writes:

```bash
cat .opendoc/current.json
```

It contains (best-effort, updated as the reader scrolls/navigates):

```json
{
  "docId": "quarterly-report",
  "title": "Document Tooling: …",
  "headingAnchor": "findings",
  "scrollOffset": 1840,
  "view": "reading",
  "selection": { "rel": "docs/…/index.tsx", "line": 46, "tag": "Prose" },
  "updatedAt": "2026-06-19T…Z"
}
```

- **`docId`** → the document is `docs/<docId>/index.tsx`.
- **`headingAnchor`** → the section heading currently in view (the `id` of a `<Heading>`); use it to locate the relevant section in source.
- **`selection`** (present if the user clicked an element in the inspector) → the exact source file/line and element tag to edit.
- **`view`** → `reading` or `page-preview`.

## Workflow

1. `cat .opendoc/current.json`. If missing, the dev server isn't running or the user hasn't opened a document — ask which doc they mean.
2. Resolve `docId` (and `headingAnchor` / `selection`) to a concrete location in `docs/<docId>/`.
3. Hand off: for edits, follow **`doc-authoring`**; for marked comments, **`apply-comments`**.

Treat `current.json` as a hint, not gospel — it reflects the last reported state. If it looks stale or contradicts the user, confirm.
