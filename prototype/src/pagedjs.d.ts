declare module 'pagedjs' {
  // Minimal surface used by the spike. paged.js ships no first-party types.
  export class Previewer {
    preview(
      content: string | Node,
      stylesheets?: Array<string | { [k: string]: string }>,
      renderTo?: Element,
    ): Promise<{ total: number; pages: unknown[] }>;
  }
}
