import type { Section } from '../../sdk';
import { SectionProvider } from '../../section-context';

/**
 * Replaces open-slide's `SlideTransitionLayer`. Mounts ALL sections
 * concatenated into one continuous flow. Section metadata (id / breakBefore /
 * breakAvoid) is read off the component's static props and projected onto a
 * wrapper so CSS fragmentation + scroll-spy can target it.
 */
/**
 * Cross-section footnote numbering: renumber refs + notes in reading order
 * across the whole document so authors can omit explicit `n`. Lives in the live
 * tree only (called from DocPage), never in the server-rendered export path.
 */
export function numberFootnotes(root: ParentNode = document) {
  root.querySelectorAll<HTMLElement>('[data-odc-footref]').forEach((el, i) => {
    el.textContent = String(i + 1);
    el.id = `fnref-${i + 1}`;
  });
  root.querySelectorAll<HTMLElement>('[data-odc-footnote]').forEach((el, i) => {
    el.id = `fn-${i + 1}`;
    const num = el.querySelector('.odc-footnote-n');
    if (num) num.textContent = String(i + 1);
  });
}

export function DocBody({ sections }: { sections: Section[] }) {
  const total = sections.length;
  return (
    <>
      {sections.map((S, i) => {
        const id = S.id ?? `section-${i + 1}`;
        return (
          <div
            key={id}
            id={id}
            data-odc-section
            className={`odc-section-wrap${S.breakAvoid ? ' odc-keep-together' : ''}`}
            data-break-before={S.breakBefore ? '' : undefined}
          >
            <SectionProvider index={i} total={total}>
              <S />
            </SectionProvider>
          </div>
        );
      })}
    </>
  );
}
