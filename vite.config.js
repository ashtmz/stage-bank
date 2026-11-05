import { defineConfig } from 'vite';

export default defineConfig({
  esbuild: { jsx: 'automatic' },
  server: { host: '127.0.0.1', port: 5173, strictPort: true },
  preview: { host: '127.0.0.1', port: 4173 },
  build: { rollupOptions: { output: { manualChunks(id) {
    if (id.includes('node_modules')) return 'vendor';
    const dataFile = id.match(/src\/data\/([^/]+)\.json$/);
    if (dataFile) return `terms-${dataFile[1]}`;
  } } } },
});
