import react from '@vitejs/plugin-react';
import { defineConfig } from 'vite';
import { inspectorApiPlugin } from './vite/inspector-api';
import { locTagsPlugin } from './vite/loc-tags';

// locTagsPlugin (enforce:'pre') injects data-odc-loc onto JSX authored under
// docs/ — the reliable source-position backbone. inspectorApiPlugin adds the
// dev-only /__odc/comment write-back route.
export default defineConfig({
  plugins: [locTagsPlugin(), react(), inspectorApiPlugin()],
  server: { port: 5180 },
});
