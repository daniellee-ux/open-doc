import {
  Callout,
  Figure,
  Footnote,
  FootnoteRef,
  Heading,
  KeepTogether,
  Lead,
  List,
  PageBreak,
  Prose,
  Table,
} from '../../src/primitives';
import { defaultDesign, type DesignSystem } from '../../src/design';
import type { DocMeta, Section } from '../../src/sdk';

/* ---------------------------------------------------------------------------
   A sample Opendoc document. Mirrors the real contract:
     export default [Section, Section, …]   (array order == reading order)
     export const meta / design
   Section metadata (id / toc / breakBefore) is set as static props on each
   component — read by DocBody at render time.
   --------------------------------------------------------------------------- */

const Cover: Section = () => (
  <>
    <p
      style={{
        fontFamily: 'var(--odc-font-head)',
        fontSize: 'var(--odc-caption)',
        letterSpacing: '0.14em',
        textTransform: 'uppercase',
        color: 'var(--odc-color-accent)',
        margin: '0 0 1.2em',
      }}
    >
      Platform Engineering · Q2 2026
    </p>
    <Heading level={1}>Document Tooling: State of Play & the Case for Opendoc</Heading>
    <Lead>
      A review of how teams author long-form internal documents, why the current toolchain
      produces inconsistent and unmaintainable output, and a proposal to treat documents the
      way we already treat slides — as code.
    </Lead>
    <Prose>
      Prepared by the Platform Engineering group. Distribution: engineering leads, design
      systems, and the docs working group. Feedback due by the end of the quarter.
    </Prose>
  </>
);
Cover.id = 'cover';

const Summary: Section = () => (
  <>
    <Heading level={2}>Executive summary</Heading>
    <Prose>
      Our documents are written in five different tools and look like it. The same report,
      authored by three people, will use three heading scales, two citation styles, and an
      unknowable number of font stacks. None of it is themeable after the fact, and none of it
      survives a copy-paste into a different surface. We propose adopting a single, code-first
      document framework — Opendoc — that renders React components into a continuous, themeable
      reading column and exports print-fidelity PDF.
    </Prose>
    <Prose>
      The key insight is that documents, like slides, are visual code, and coding agents are
      good at writing code. The framework owns layout, typography, navigation, and pagination so
      the author owns only the content.
    </Prose>
    <Callout kind="tip" title="The one-line pitch">
      Describe the document in natural language; your agent writes the React; Opendoc handles
      the measure, theming, table of contents, and the PDF.
    </Callout>
  </>
);
Summary.id = 'summary';
Summary.toc = { title: 'Executive summary', level: 1 };

const Background: Section = () => (
  <>
    <Heading level={2}>Background</Heading>
    <Prose>
      Three constraints make document tooling uniquely painful, and they compound. First,
      documents are long, so small inconsistencies accumulate into large ones. Second, documents
      outlive their authors — a spec written today is read for years — so maintainability is not
      optional. Third, documents must print, and the web platform's pagination story has
      historically been an afterthought.<FootnoteRef n={1} />
    </Prose>
    <Heading level={3}>What "good" looks like</Heading>
    <Prose>
      A good document system gives every author the same typographic defaults, keeps the reading
      measure within a comfortable line length, builds its own table of contents, and produces a
      PDF whose page breaks fall in sensible places without anyone hand-nudging them.
    </Prose>
    <List>
      <li>One type scale, one set of margins, one citation style — by default, not by discipline.</li>
      <li>A table of contents derived from the headings, not maintained by hand.</li>
      <li>Figures, tables, and callouts that never split awkwardly across a page boundary.</li>
      <li>Output that is real, selectable, searchable text — never a screenshot of text.</li>
    </List>
    <Footnote n={1}>
      CSS Paged Media (the `@page` rule, running headers, and `break-inside`) is now broadly
      usable, and the paged.js polyfill fills the remaining gaps for headers, footnotes, and
      cross-reference page numbers.
    </Footnote>
  </>
);
Background.id = 'background';
Background.toc = { title: 'Background', level: 1 };

const Findings: Section = () => (
  <>
    <Heading level={2}>Findings</Heading>
    <Prose>
      We surveyed a quarter's worth of internal documents. The headline result: consistency
      degrades sharply with the number of authors, and effort spent on formatting rises just as
      sharply — effort that produces no durable value because none of it is themeable.
    </Prose>

    <Figure caption="Figure 1 — Formatting effort vs. authors per document. More hands, more divergence.">
      <svg viewBox="0 0 640 280" role="img" aria-label="Bar chart of formatting effort by author count">
        <rect x="0" y="0" width="640" height="280" fill="#faf8f3" />
        <line x1="56" y1="232" x2="616" y2="232" stroke="#d8d4c8" strokeWidth="1.5" />
        <line x1="56" y1="32" x2="56" y2="232" stroke="#d8d4c8" strokeWidth="1.5" />
        {[
          { x: 110, h: 46, label: '1' },
          { x: 230, h: 96, label: '2' },
          { x: 350, h: 150, label: '3' },
          { x: 470, h: 188, label: '4+' },
        ].map((b) => (
          <g key={b.label}>
            <rect x={b.x} y={232 - b.h} width="70" height={b.h} rx="3" fill="#b4532a" opacity={0.86} />
            <text x={b.x + 35} y={250} textAnchor="middle" fontSize="13" fill="#6b6a63" fontFamily="sans-serif">
              {b.label}
            </text>
          </g>
        ))}
        <text x="336" y="274" textAnchor="middle" fontSize="12" fill="#9a978d" fontFamily="sans-serif">
          authors per document
        </text>
      </svg>
    </Figure>

    <Prose>
      The breakdown by tool tells the same story from another angle. The more powerful the tool's
      formatting affordances, the more divergent the output — power without shared defaults is
      just rope.
    </Prose>

    <Table
      head={
        <tr>
          <th>Tool</th>
          <th>Themeable</th>
          <th>TOC</th>
          <th>PDF fidelity</th>
          <th>Maintainable</th>
        </tr>
      }
    >
      <tr>
        <td>Rich-text editor</td>
        <td>No</td>
        <td>Manual</td>
        <td>Medium</td>
        <td>Low</td>
      </tr>
      <tr>
        <td>Wiki / markdown</td>
        <td>Partial</td>
        <td>Plugin</td>
        <td>Low</td>
        <td>Medium</td>
      </tr>
      <tr>
        <td>Word processor</td>
        <td>Templates</td>
        <td>Built-in</td>
        <td>High</td>
        <td>Low</td>
      </tr>
      <tr>
        <td>LaTeX</td>
        <td>Yes</td>
        <td>Built-in</td>
        <td>Very high</td>
        <td>High (steep)</td>
      </tr>
      <tr>
        <td>Opendoc (proposed)</td>
        <td>Yes (tokens)</td>
        <td>Automatic</td>
        <td>High</td>
        <td>High</td>
      </tr>
    </Table>
  </>
);
Findings.id = 'findings';
Findings.toc = { title: 'Findings', level: 1 };

const Recommendations: Section = () => (
  <>
    <Heading level={2}>Recommendations</Heading>
    <Prose>
      Adopt a continuous-flow rendering model: author and read one scrolling column, and let the
      framework paginate only at export time. This keeps authoring simple and output faithful,
      and it lets us reuse the slide framework's entire authoring spine.
    </Prose>

    <KeepTogether>
      <Heading level={3}>Why continuous-flow wins</Heading>
      <Prose>
        A paginated editor would force us to build and maintain a browser layout engine that
        splits content across page boundaries — the single hardest problem in the space, and a
        permanent tax. Continuous-flow gets the same output by mounting a paged preview on
        demand, while letting us delete more inherited code than we write. This block is wrapped
        in <code>&lt;KeepTogether&gt;</code> so it never splits across a page.
      </Prose>
    </KeepTogether>

    <Callout kind="warn" title="The one real risk">
      "Looks right while scrolling" is not a guarantee about page breaks. We mitigate by baking
      <code> break-inside: avoid </code> into figures, tables, and callouts, and by keeping the
      paged preview one click away — but it cannot be eliminated, only managed.
    </Callout>

    <Heading level={3}>Sequencing</Heading>
    <List ordered>
      <li>Stand up the runtime: discovery, the continuous renderer, the primitive kit, the TOC.</li>
      <li>Port the click-to-source inspector (the crown jewel) onto the scrolling viewport.</li>
      <li>Ship browser-print PDF, then upgrade to paged.js fidelity for headers and page refs.</li>
      <li>Add the authoring skills so an agent can draft and revise a document end to end.</li>
    </List>
  </>
);
Recommendations.id = 'recommendations';
Recommendations.toc = { title: 'Recommendations', level: 1 };

const Appendix: Section = () => (
  <>
    <Heading level={2}>Appendix: method</Heading>
    <Prose>
      This section begins on a fresh page — its component carries{' '}
      <code>breakBefore = true</code>, which projects to <code>break-before: page</code> in the
      paged output. On screen you see a dashed "page break" marker; in the PDF and the paged
      preview it becomes a genuine new page.
    </Prose>
    <Prose>
      Sample frame: one quarter of internal documents across engineering, design, and product.
      Effort was self-reported in rough hours and normalized; "themeability" was assessed by
      attempting to restyle a finished document without editing its content. The sample is small
      and the intent is directional, not statistical.
    </Prose>
    <Prose>
      The document you are reading was itself produced with the Opendoc renderer prototype, which
      is the most honest test we have: if it cannot render its own proposal cleanly, the proposal
      is wrong.
    </Prose>
  </>
);
Appendix.id = 'appendix';
Appendix.toc = { title: 'Appendix: method', level: 1 };
Appendix.breakBefore = true;

export const meta: DocMeta = {
  title: 'Document Tooling: State of Play & the Case for Opendoc',
  author: 'Platform Engineering',
  createdAt: '2026-06-19T12:00:00Z',
};

export const design: DesignSystem = defaultDesign;

export default [
  Cover,
  Summary,
  Background,
  Findings,
  Recommendations,
  Appendix,
] satisfies Section[];
