const express = require('express');
const path = require('node:path');
const fs = require('node:fs');
const auditsRouter = require('./routes/audits');

const WEB_DIST = path.join(__dirname, '..', 'web', 'dist');

/**
 * Build the Express app. Kept separate from index.js so tests can import
 * and exercise it (e.g. with supertest) without binding a real port.
 */
function createApp() {
  const app = express();

  app.use(express.json());

  app.get('/api/health', (_req, res) => {
    res.json({ ok: true });
  });

  app.use('/api', auditsRouter);

  // Serve the built React app if it exists (`npm run build` in web/), so
  // `node server/index.js` alone can serve the whole demo on one port.
  // In dev, the frontend runs on its own Vite server and proxies /api here
  // instead — see web/vite.config.js.
  if (fs.existsSync(WEB_DIST)) {
    app.use(express.static(WEB_DIST));
    app.get('/{*splat}', (_req, res) => {
      res.sendFile(path.join(WEB_DIST, 'index.html'));
    });
  }

  // Malformed JSON bodies, and anything else that reaches here.
  app.use((err, _req, res, _next) => {
    console.error(err);
    res.status(err.status || 500).json({ error: err.message || 'Internal server error' });
  });

  return app;
}

module.exports = { createApp };
