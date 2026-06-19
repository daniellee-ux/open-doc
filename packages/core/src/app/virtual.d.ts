declare module 'virtual:opendoc/docs' {
  import type { DocModule } from '../sdk';
  export const docIds: string[];
  export function loadDoc(id: string): Promise<DocModule>;
}

declare module 'virtual:opendoc/config' {
  interface ResolvedConfig {
    docsDir: string;
    page: { size: 'Letter' | 'A4'; margin: string; orientation?: 'portrait' | 'landscape' };
    build: {
      showDocBrowser: boolean;
      showDocUi: boolean;
      allowHtmlDownload: boolean;
      allowPdfDownload: boolean;
    };
    version: string;
  }
  const config: ResolvedConfig;
  export default config;
}

declare module '*.css?raw' {
  const css: string;
  export default css;
}

declare module 'pagedjs' {
  export class Previewer {
    preview(
      content: string | Node,
      stylesheets?: Array<string | { [k: string]: string }>,
      renderTo?: Element,
    ): Promise<{ total: number; pages: unknown[] }>;
  }
}
