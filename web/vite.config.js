import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

// Dev server proxies /api to the Express backend (npm run server, port
// 3001) so the browser only ever talks to one origin and we don't need
// CORS. In production the built output here is served by that same
// Express server as static files (see server/app.js) — also one origin.
export default defineConfig({
  plugins: [react()],
  server: {
    proxy: {
      '/api': 'http://localhost:3001',
    },
  },
});
