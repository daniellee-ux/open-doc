import { Callout, Heading, Lead, List, Prose } from '@opendoc/core';
import type { DocMeta, Section } from '@opendoc/core';

const Intro: Section = () => (
  <>
    <Heading level={1}>Getting started with Opendoc</Heading>
    <Lead>
      Opendoc turns a folder of React components into a themeable, paginated document. Write prose,
      let the framework own layout, theming, the table of contents, and the PDF.
    </Lead>
    <Prose>
      A document is a folder under <code>docs/</code> with an <code>index.tsx</code> that default-
      exports an array of section components. Array order is reading order — that's the whole
      contract.
    </Prose>
    <Callout kind="tip" title="Author with your agent">
      Describe the document in natural language; your coding agent writes the React. The inspector
      (top-right) lets you click any block and leave a comment that lands in the exact source line.
    </Callout>
  </>
);
Intro.id = 'intro';

const Primitives: Section = () => (
  <>
    <Heading level={2}>The primitive kit</Heading>
    <Prose>You compose sections from a small vocabulary of components:</Prose>
    <List>
      <li>
        <code>&lt;Heading&gt;</code>, <code>&lt;Lead&gt;</code>, <code>&lt;Prose&gt;</code>,{' '}
        <code>&lt;List&gt;</code> — text and structure.
      </li>
      <li>
        <code>&lt;Figure&gt;</code>, <code>&lt;Callout&gt;</code>, <code>&lt;Table&gt;</code> — blocks
        that stay whole across page breaks by default.
      </li>
      <li>
        <code>&lt;PageBreak&gt;</code>, <code>&lt;KeepTogether&gt;</code> — pagination control for
        the print/PDF output.
      </li>
    </List>
    <Prose>
      See the <strong>quarterly-report</strong> document for a fuller example that exercises figures,
      tables, footnotes, and a forced page break.
    </Prose>
  </>
);
Primitives.id = 'primitives';
Primitives.toc = { title: 'The primitive kit', level: 1 };

export const meta: DocMeta = {
  title: 'Getting started with Opendoc',
  author: 'Opendoc',
  theme: 'technical',
  createdAt: '2026-06-19T10:00:00Z',
};

export default [Intro, Primitives] satisfies Section[];
