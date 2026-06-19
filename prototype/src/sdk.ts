import type { FC } from 'react';
import type { DesignSystem } from './design';

/**
 * The Opendoc module contract — the document analog of open-slide's `Page` /
 * `SlideModule`. A document is still an ordered array (array order == reading
 * order), but every section is rendered CONCATENATED into one continuous flow
 * rather than shown one-at-a-time on a scaled canvas.
 *
 * Section metadata (id / breakBefore / toc) lives as static properties on the
 * component, exactly like open-slide's `Page.transition`. `DocBody` reads them
 * off the component at render time.
 */
export type Section = FC & {
  /** Stable anchor id for TOC links + scroll-spy. Defaults to `section-{n}`. */
  id?: string;
  /** Force a print page break before this section (CSS `break-before: page`). */
  breakBefore?: boolean;
  /** Keep this whole section together when paginating (`break-inside: avoid`). */
  breakAvoid?: boolean;
  /** Optional explicit outline entry (headings are auto-collected otherwise). */
  toc?: { title: string; level: 1 | 2 | 3 };
};

export interface DocMeta {
  title?: string;
  author?: string;
  theme?: string;
  /** ISO 8601 string literal — quoted, so the build-time meta regex can scrape it. */
  createdAt?: string;
}

export type PaperSize = 'Letter' | 'A4';

export interface PageSize {
  size: PaperSize;
  margin: string;
  orientation?: 'portrait' | 'landscape';
}

export interface DocModule {
  default: Section[];
  meta?: DocMeta;
  design?: DesignSystem;
  page?: PageSize;
}

/** Replaces open-slide's CANVAS_WIDTH=1920 / CANVAS_HEIGHT=1080. */
export const CONTENT_WIDTH = 720; // px — reading column "measure" (~66ch)

export const DEFAULT_PAGE: PageSize = { size: 'Letter', margin: '1in', orientation: 'portrait' };
