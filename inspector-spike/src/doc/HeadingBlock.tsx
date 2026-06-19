import { Heading, Lead } from './primitives';

/**
 * A composite component defined OUTSIDE docs/ — the hardest case from the
 * critique (Risk #2). When the author uses <HeadingBlock> in a section file and
 * clicks its rendered text, the inspector must climb past THIS file (src/doc/…)
 * and resolve to the <HeadingBlock> usage site in the doc section file.
 */
export function HeadingBlock({ title, lead }: { title: string; lead: string }) {
  return (
    <>
      <Heading level={2}>{title}</Heading>
      <Lead>{lead}</Lead>
    </>
  );
}
