import react from '@vitejs/plugin-react';
import { defineConfig } from 'vite';

// Minimal config — the spike validates the renderer, not the full Vite-plugin
// discovery pipeline (that lives in @opendoc/core). The sample document is
// imported directly instead of via a virtual:opendoc/docs module.
export default defineConfig({
  plugins: [react()],
  server: { port: 5179 },
});
