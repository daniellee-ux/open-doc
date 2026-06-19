import { Heading, Lead, Prose } from '../../../src/doc/primitives';

// Section authored in its OWN file. Clicking any block here must resolve to
// docs/report/sections/cover.tsx — not docs/report/index.tsx.
export function Cover() {
  return (
    <>
      <Heading level={1}>Field Notes on Document Tooling</Heading>
      <Lead>
        A short report used to exercise the Opendoc inspector across multiple source files. Every
        paragraph below lives in cover.tsx.
      </Lead>
      <Prose>
        The premise: documents are visual code, and the inspector should let you click any
        rendered block and leave a comment that lands in the exact source file and line where that
        block was authored — even when the block is produced by a shared framework component.
      </Prose>
      <Prose>
        This cover section is intentionally ordinary prose. Hover it with the inspector on and the
        frame label should read cover.tsx; click it and the popover should resolve to this file.
      </Prose>
      <Prose>
        Padding paragraph to give the page some height so the document actually scrolls, which is
        the condition under which the overlay frame has to keep tracking the element it points at.
      </Prose>
    </>
  );
}
