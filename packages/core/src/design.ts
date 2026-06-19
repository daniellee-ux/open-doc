import type { CSSProperties } from 'react';

/**
 * Document-oriented design tokens — same machinery as open-slide's
 * `DesignSystem` / `designToCssVars`, but the type scale targets BODY TEXT
 * (rem-based hierarchy) rather than a slide-display scale (hero = 168px).
 * Emitted as `--odc-*` CSS variables on the `[data-odc-doc]` root.
 */
export interface DesignSystem {
  palette: { bg: string; fg: string; muted: string; accent: string; rule: string };
  fonts: { body: string; heading: string };
  /** rem multipliers off a 16px base. */
  typeScale: {
    h1: number;
    h2: number;
    h3: number;
    h4: number;
    body: number;
    lead: number;
    caption: number;
    footnote: number;
  };
  measure: string;
  leading: number;
  paraSpacing: string;
}

export const defaultDesign: DesignSystem = {
  palette: { bg: '#ffffff', fg: '#1c1b19', muted: '#6b6a63', accent: '#b4532a', rule: '#e6e4dc' },
  fonts: {
    body: "'Iowan Old Style', 'Palatino Linotype', Palatino, Georgia, 'Times New Roman', serif",
    heading: "ui-sans-serif, system-ui, -apple-system, 'Segoe UI', Helvetica, Arial, sans-serif",
  },
  typeScale: {
    h1: 2.4,
    h2: 1.6,
    h3: 1.25,
    h4: 1.05,
    body: 1.0,
    lead: 1.2,
    caption: 0.85,
    footnote: 0.8,
  },
  measure: '720px',
  leading: 1.62,
  paraSpacing: '1.05em',
};

/** Built-in themes, selectable via `meta.theme` or the /themes gallery. */
export const designPresets: Record<string, DesignSystem> = {
  editorial: defaultDesign,
  technical: {
    palette: { bg: '#ffffff', fg: '#16191d', muted: '#5a626b', accent: '#1f6feb', rule: '#e3e6ea' },
    fonts: {
      body: "-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif",
      heading: "ui-monospace, SFMono-Regular, 'JetBrains Mono', Menlo, Consolas, monospace",
    },
    typeScale: { h1: 2.1, h2: 1.5, h3: 1.2, h4: 1.05, body: 1.0, lead: 1.1, caption: 0.85, footnote: 0.8 },
    measure: '740px',
    leading: 1.6,
    paraSpacing: '1em',
  },
  manuscript: {
    palette: { bg: '#fbfaf7', fg: '#23201b', muted: '#6f685c', accent: '#7a5c2e', rule: '#e7e1d4' },
    fonts: {
      body: "'Iowan Old Style', 'Times New Roman', Times, serif",
      heading: "'Iowan Old Style', 'Times New Roman', Times, serif",
    },
    typeScale: { h1: 2.2, h2: 1.5, h3: 1.2, h4: 1.05, body: 1.05, lead: 1.2, caption: 0.85, footnote: 0.8 },
    measure: '680px',
    leading: 1.75,
    paraSpacing: '0.6em',
  },
};

/** Resolve the effective design: explicit `design` wins, else `meta.theme`, else default. */
export function resolveDesign(opts: { design?: DesignSystem; theme?: string }): DesignSystem {
  if (opts.design) return opts.design;
  if (opts.theme && designPresets[opts.theme]) return designPresets[opts.theme];
  return defaultDesign;
}

export function designToCssVars(d: DesignSystem): CSSProperties {
  const rem = (n: number) => `${n}rem`;
  return {
    '--odc-color-bg': d.palette.bg,
    '--odc-color-fg': d.palette.fg,
    '--odc-color-muted': d.palette.muted,
    '--odc-color-accent': d.palette.accent,
    '--odc-color-rule': d.palette.rule,
    '--odc-font-body': d.fonts.body,
    '--odc-font-head': d.fonts.heading,
    '--odc-h1': rem(d.typeScale.h1),
    '--odc-h2': rem(d.typeScale.h2),
    '--odc-h3': rem(d.typeScale.h3),
    '--odc-h4': rem(d.typeScale.h4),
    '--odc-body': rem(d.typeScale.body),
    '--odc-lead': rem(d.typeScale.lead),
    '--odc-caption': rem(d.typeScale.caption),
    '--odc-footnote': rem(d.typeScale.footnote),
    '--odc-measure': d.measure,
    '--odc-leading': String(d.leading),
    '--odc-para-gap': d.paraSpacing,
  } as CSSProperties;
}
