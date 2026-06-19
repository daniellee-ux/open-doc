import type { Section } from '../sdk';
import { SectionProvider } from '../section-context';

/**
 * Replaces open-slide's `SlideTransitionLayer`. Instead of mounting
 * `pages[index]` and animating swaps, it mounts ALL sections concatenated into
 * one continuous flow. Section metadata (id / breakBefore / breakAvoid) is read
 * off the component's static props at render time and projected onto a wrapper
 * so CSS fragmentation + scroll-spy can target it.
 */
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
