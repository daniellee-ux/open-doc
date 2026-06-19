---
name: apply-comments
description: Use this skill when the user has left inspector comments on a document and wants them applied — "apply the comments", "do the edits I marked", "process my notes". Finds `@doc-comment` markers (and `data-odc-comment` attributes) in `docs/`, applies each requested change, then removes the markers.
---

# Apply inspector comments

The in-browser inspector persists each comment into the source as a marker. This skill finds every pending marker, applies the requested edit following the **`doc-authoring`** rules, and clears the marker.

## Marker grammar

Two forms are written by the inspector:

- On a normal element — a JSX comment as its first child:
  ```tsx
  <Prose>{/* @doc-comment: "make this sentence bold" */}…</Prose>
  ```
- On a self-closing element — a data attribute:
  ```tsx
  <Figure data-odc-comment="use the updated chart" … />
  ```

Find them all:

```bash
grep -rnE '@doc-comment:|data-odc-comment=' docs/
```

The comment text is the string after `@doc-comment:` (or the `data-odc-comment` value).

## Workflow

1. **Collect** every marker with `grep` (above). Note the file, line, and the element each marker is attached to.
2. **Apply edits bottom-up** — process markers in **descending line order within each file** so earlier edits don't shift later line numbers. For each: read the surrounding code, make the change the comment asks for (consult `doc-authoring` for how), following the document's existing palette/voice.
3. **Remove the marker** you just satisfied — delete the `{/* @doc-comment: … */}` child or the `data-odc-comment="…"` attribute.
4. **Verify none remain**:
   ```bash
   grep -rnE '@doc-comment:|data-odc-comment=' docs/ && echo "STILL PENDING" || echo "all clear"
   ```
5. Briefly summarize what you changed per comment. The dev server hot-reloads, so the user sees the result immediately.

Never leave a marker in place after acting on it, and never apply an edit you don't understand — ask instead.
