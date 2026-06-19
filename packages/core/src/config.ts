import type { PageSize } from './sdk';

export interface OpendocBuildConfig {
  /** Show the document library / home page. */
  showDocBrowser?: boolean;
  /** Show the editing UI (toolbar, inspector). Off → clean reading build. */
  showDocUi?: boolean;
  allowHtmlDownload?: boolean;
  allowPdfDownload?: boolean;
}

export interface OpendocConfig {
  base?: string;
  /** Directory holding `docs/<id>/index.tsx`. Default: "docs". */
  docsDir?: string;
  themesDir?: string;
  assetsDir?: string;
  port?: number;
  /** Default print geometry for documents that don't set their own `page`. */
  page?: PageSize;
  build?: OpendocBuildConfig;
}
