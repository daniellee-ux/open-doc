---
name: create-doc
description: Use this skill when the user wants to create, draft, author, or generate a new document / report / spec / memo in this Opendoc repo. Triggers on "write a report about X", "create a doc", "draft a spec for", "new document", or adding content under `docs/`. Do NOT use for editing the framework itself — only for authoring content inside `docs/<id>/`.
---

# Create a document in Opendoc

This skill owns the **workflow** for drafting a new document. The technical reference — file contract, primitives, design tokens, pagination rules — lives in the **`doc-authoring`** skill. Read that before writing code. You only write files under `docs/<id>/`; never modify `package.json`, `opendoc.config.ts`, or other documents.

## Step 1 — Clarify scope (ask before writing)

Use `AskUserQuestion` to lock in, unless the user's message already answers them:

1. **Topic & audience** — what is the document about, and who reads it? (If the request is thin, ask this first, on its own.)
2. **Length / depth** — short memo (1–2 sections), standard report (4–6), or deep dive (7+).
3. **Structure** — propose a section outline tailored to the topic (e.g. Cover · Summary · Background · Findings · Recommendations · Appendix) and confirm it.
4. **Output target** — primarily on-screen reading, or print/PDF too? (Affects paper size and page-break discipline.) Default paper: Letter; offer A4.

Skip any question the user already answered; restate your assumption so they can correct it.

## Step 2 — Pick an id

Kebab-case, short, descriptive: `q2-report`, `auth-spec`, `onboarding-memo`. Check `docs/` to avoid collisions.

## Step 3 — Plan the sections

Sketch the document as a list of section roles before writing. One coherent idea per section. Decide which sections (if any) deserve `breakBefore` (new chapter) and which content must be `<KeepTogether>`.

## Step 4 — Write `docs/<id>/index.tsx`

Read **`doc-authoring`** first, then write. Each section is a `Section` component; set `.id` (and `.toc` / `.breakBefore` where appropriate). Add `export const meta` with `title` and a real `createdAt` (run `node -e "console.log(new Date().toISOString())"`). Add `export const design`/`page` only if the user wants a specific theme or paper.

For long documents, split sections into `docs/<id>/sections/*.tsx` imported by `index.tsx` (the inspector handles cross-file editing).

## Step 5 — Self-review

Run the checklist at the end of `doc-authoring` (contract, heading hierarchy, figures, createdAt, pagination, Page-preview check).

## Step 6 — Hand off

Tell the user the id and path, that the dev server hot-reloads (`http://localhost:5173/d/<id>`), and that `Page preview` shows the paginated PDF layout. If dev isn't running: `npm run dev` (or `opendoc dev`) from the workspace.
