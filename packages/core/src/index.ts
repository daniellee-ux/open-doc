// Public API of @opendoc/core — what documents under docs/<id>/ import.
export type { Section, DocMeta, DocModule, PaperSize, PageSize } from './sdk';
export { CONTENT_WIDTH, DEFAULT_PAGE } from './sdk';
export type { DesignSystem } from './design';
export { defaultDesign, designPresets, designToCssVars, resolveDesign } from './design';
export { useSectionNumber } from './section-context';
export type { OpendocConfig, OpendocBuildConfig } from './config';
export {
  Heading,
  Lead,
  Prose,
  List,
  Figure,
  Callout,
  Table,
  KeepTogether,
  PageBreak,
  Footnote,
  FootnoteRef,
} from './primitives';
