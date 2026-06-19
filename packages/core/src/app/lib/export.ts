import { renderToStaticMarkup } from 'react-dom/server';
import docCss from '../doc.css?raw';
import type { DesignSystem } from '../../design';
import type { DocMeta, Section } from '../../sdk';
import { DocBody } from '../components/DocBody';
import { DocSurface } from '../components/DocSurface';
import { createElement } from 'react';

/**
 * Export pipeline (PLAN §6, M4). HTML and Markdown are produced from a SINGLE
 * mounted Section[] tree (renderToStaticMarkup), not per-section captures — so
 * cross-section structure and numbering survive (the critique's HTML fix).
 */

function staticDoc(sections: Section[], design?: DesignSystem, title?: string): string {
  return renderToStaticMarkup(
    createElement(DocSurface, { design, title, children: createElement(DocBody, { sections }) }),
  );
}

function download(filename: string, content: string, type: string) {
  const blob = new Blob([content], { type });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}

const WRAPPER_CSS = `
  *{box-sizing:border-box}
  body{margin:0;background:#fff;color:#1c1b19}
  .odc-export{max-width:760px;margin:48px auto;padding:0 28px}
`;

export function buildHtml(sections: Section[], design?: DesignSystem, meta?: DocMeta): string {
  const body = staticDoc(sections, design, meta?.title);
  const title = meta?.title ?? 'Document';
  return `<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8" />
<meta name="viewport" content="width=device-width, initial-scale=1" />
<title>${escapeHtml(title)}</title>
<style>${WRAPPER_CSS}${docCss}</style>
</head>
<body><main class="odc-export">${body}</main></body>
</html>`;
}

export function exportHtml(sections: Section[], id: string, design?: DesignSystem, meta?: DocMeta) {
  download(`${id}.html`, buildHtml(sections, design, meta), 'text/html');
}

/* ---- Markdown -------------------------------------------------------------- */

export function buildMarkdown(sections: Section[], meta?: DocMeta): string {
  const host = document.createElement('div');
  host.innerHTML = staticDoc(sections);
  const surface = host.querySelector('.odc-surface') ?? host;
  const lines: string[] = [];
  // Only synthesize a title heading if the document doesn't already open with one.
  if (meta?.title && !surface.querySelector('.odc-h1')) lines.push(`# ${meta.title}`, '');
  for (const wrap of Array.from(surface.querySelectorAll('.odc-section-wrap'))) {
    for (const el of Array.from(wrap.children)) walk(el as HTMLElement, lines);
  }
  return `${lines.join('\n').replace(/\n{3,}/g, '\n\n').trim()}\n`;
}

function walk(el: HTMLElement, out: string[]) {
  const cls = el.classList;
  const text = (el.textContent ?? '').replace(/\s+/g, ' ').trim();
  if (/^H[1-4]$/.test(el.tagName)) {
    out.push(`${'#'.repeat(Number(el.tagName[1]))} ${text}`, '');
  } else if (cls.contains('odc-lead') || cls.contains('odc-prose')) {
    out.push(text, '');
  } else if (cls.contains('odc-list') || el.tagName === 'UL' || el.tagName === 'OL') {
    const ordered = el.tagName === 'OL';
    Array.from(el.querySelectorAll('li')).forEach((li, i) => {
      out.push(`${ordered ? `${i + 1}.` : '-'} ${(li.textContent ?? '').replace(/\s+/g, ' ').trim()}`);
    });
    out.push('');
  } else if (cls.contains('odc-callout')) {
    const title = el.querySelector('.odc-callout-title')?.textContent?.trim();
    const bodyText = el.querySelector('.odc-callout-title')?.nextElementSibling?.textContent ?? text;
    out.push(`> **${title ?? 'Note'}** — ${bodyText.replace(/\s+/g, ' ').trim()}`, '');
  } else if (el.tagName === 'FIGURE' || cls.contains('odc-figure')) {
    const cap = el.querySelector('.odc-figcaption')?.textContent?.trim() ?? 'figure';
    out.push(`*${cap}*`, '');
  } else if (cls.contains('odc-table-wrap') || el.tagName === 'TABLE') {
    tableToMarkdown(el.querySelector('table') ?? el, out);
  } else if (cls.contains('odc-footnote')) {
    const n = el.querySelector('.odc-footnote-n')?.textContent?.trim();
    out.push(`[^${n}]: ${el.textContent?.replace(/^\s*\d+\s*/, '').replace(/\s+/g, ' ').trim()}`, '');
  } else if (text) {
    out.push(text, '');
  }
}

function tableToMarkdown(table: Element, out: string[]) {
  const rows = Array.from(table.querySelectorAll('tr'));
  if (!rows.length) return;
  const cells = (r: Element) =>
    Array.from(r.querySelectorAll('th,td')).map((c) => (c.textContent ?? '').replace(/\s+/g, ' ').trim());
  const head = cells(rows[0]);
  out.push(`| ${head.join(' | ')} |`);
  out.push(`| ${head.map(() => '---').join(' | ')} |`);
  for (const r of rows.slice(1)) out.push(`| ${cells(r).join(' | ')} |`);
  out.push('');
}

export function exportMarkdown(sections: Section[], id: string, meta?: DocMeta) {
  download(`${id}.md`, buildMarkdown(sections, meta), 'text/markdown');
}

/* ---- DOCX (lazy — heavy dep, only loaded on export) ----------------------- */

export async function buildDocx(sections: Section[], meta?: DocMeta): Promise<Blob> {
  const docx = await import('docx');
  const { Document, Packer, Paragraph, HeadingLevel, TextRun, Table, TableRow, TableCell, WidthType } =
    docx;
  const host = document.createElement('div');
  host.innerHTML = staticDoc(sections);
  const surface = host.querySelector('.odc-surface') ?? host;
  const txt = (el: Element) => (el.textContent ?? '').replace(/\s+/g, ' ').trim();
  // docx's section children are a heterogeneous union (Paragraph | Table | …);
  // build an untyped list and cast at the Document boundary.
  const out: unknown[] = [];

  if (meta?.title && !surface.querySelector('.odc-h1')) {
    out.push(new Paragraph({ text: meta.title, heading: HeadingLevel.TITLE }));
  }

  const headingLevel = (tag: string) =>
    ({
      H1: HeadingLevel.HEADING_1,
      H2: HeadingLevel.HEADING_2,
      H3: HeadingLevel.HEADING_3,
      H4: HeadingLevel.HEADING_4,
    })[tag];

  for (const wrap of Array.from(surface.querySelectorAll('.odc-section-wrap'))) {
    for (const el of Array.from(wrap.children) as HTMLElement[]) {
      const cls = el.classList;
      if (/^H[1-4]$/.test(el.tagName)) {
        out.push(new Paragraph({ text: txt(el), heading: headingLevel(el.tagName) }));
      } else if (cls.contains('odc-lead')) {
        out.push(new Paragraph({ children: [new TextRun({ text: txt(el), italics: true })] }));
      } else if (cls.contains('odc-prose')) {
        out.push(new Paragraph({ text: txt(el) }));
      } else if (el.tagName === 'UL' || el.tagName === 'OL' || cls.contains('odc-list')) {
        Array.from(el.querySelectorAll('li')).forEach((li) =>
          out.push(new Paragraph({ text: txt(li), bullet: { level: 0 } })),
        );
      } else if (cls.contains('odc-callout')) {
        out.push(
          new Paragraph({
            children: [
              new TextRun({ text: `${txt(el.querySelector('.odc-callout-title') ?? el)}: `, bold: true }),
              new TextRun({
                text: txt(el.querySelector('.odc-callout-title')?.nextElementSibling ?? el),
              }),
            ],
          }),
        );
      } else if (el.tagName === 'FIGURE' || cls.contains('odc-figure')) {
        out.push(
          new Paragraph({
            children: [
              new TextRun({ text: txt(el.querySelector('.odc-figcaption') ?? el), italics: true }),
            ],
          }),
        );
      } else if (cls.contains('odc-table-wrap') || el.tagName === 'TABLE') {
        const table = el.querySelector('table') ?? el;
        const rows = Array.from(table.querySelectorAll('tr')).map(
          (tr, ri) =>
            new TableRow({
              children: Array.from(tr.querySelectorAll('th,td')).map(
                (cell) =>
                  new TableCell({
                    children: [
                      new Paragraph({ children: [new TextRun({ text: txt(cell), bold: ri === 0 })] }),
                    ],
                  }),
              ),
            }),
        );
        if (rows.length)
          out.push(new Table({ width: { size: 100, type: WidthType.PERCENTAGE }, rows }));
      } else if (cls.contains('odc-footnote')) {
        out.push(
          new Paragraph({
            children: [new TextRun({ text: txt(el), size: 16, color: '888888' })],
          }),
        );
      } else if (txt(el)) {
        out.push(new Paragraph({ text: txt(el) }));
      }
    }
  }

  const doc = new Document({ sections: [{ children: out as never }] });
  return Packer.toBlob(doc);
}

export async function exportDocx(sections: Section[], id: string, meta?: DocMeta) {
  const blob = await buildDocx(sections, meta);
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `${id}.docx`;
  document.body.appendChild(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}

function escapeHtml(s: string): string {
  return s.replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' })[c]!);
}
