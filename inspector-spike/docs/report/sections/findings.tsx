import { Callout, Figure, Prose } from '../../../src/doc/primitives';
import { HeadingBlock } from '../../../src/doc/HeadingBlock';

// A DIFFERENT section file. Blocks here must resolve to findings.tsx — proving
// file accuracy. The HeadingBlock usage tests resolution across a component
// defined outside docs/.
export function Findings() {
  return (
    <>
      <HeadingBlock
        title="Findings"
        lead="This heading and standfirst are rendered by HeadingBlock, a component defined in src/doc — outside the docs tree."
      />
      <Prose>
        Clicking the heading above should NOT resolve to HeadingBlock.tsx. The inspector climbs
        past framework frames and reports the &lt;HeadingBlock&gt; usage on this line in
        findings.tsx — the place an author would actually want to edit.
      </Prose>
      <Prose>
        Consistency degrades with the number of authors, and the effort spent fighting formatting
        rises with it. None of that effort is durable because none of it is themeable. A code-first
        document framework makes the defaults shared and the output themeable.
      </Prose>
      <Figure caption="Figure 1 — Formatting effort rises with author count.">
        <svg viewBox="0 0 640 240" role="img" aria-label="bar chart">
          <rect x="0" y="0" width="640" height="240" fill="#faf8f3" />
          <line x1="56" y1="200" x2="600" y2="200" stroke="#d8d4c8" strokeWidth="1.5" />
          {[
            { x: 110, h: 40 },
            { x: 240, h: 92 },
            { x: 370, h: 138 },
            { x: 500, h: 176 },
          ].map((b, i) => (
            <rect key={i} x={b.x} y={200 - b.h} width="70" height={b.h} rx="3" fill="#b4532a" opacity={0.85} />
          ))}
        </svg>
      </Figure>
      <Callout title="Recommendation">
        Adopt continuous-flow authoring with a click-to-source inspector. Click this callout to
        confirm it resolves to findings.tsx, where the &lt;Callout&gt; was written.
      </Callout>
      <Prose>
        Another padding paragraph so the combined document scrolls well past one viewport, letting
        us verify the overlay frame stays glued to its target while scrolling.
      </Prose>
    </>
  );
}
