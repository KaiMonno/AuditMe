const express = require('express');
const path = require('node:path');
const fs = require('node:fs');
const rateLimit = require('express-rate-limit');
const auditsRouter = require('./routes/audits');
const summaryRouter = require('./routes/summary');

const WEB_DIST = path.join(__dirname, '..', 'web', 'dist');

/**
 * Build the Express app. Kept separate from index.js so tests can import
 * and exercise it (e.g. with supertest) without binding a real port.
 */
function createApp() {
  const app = express();

  // Render sits behind Cloudflare, so there are at least 2 proxy hops
  // between a client and this app (verified in production: the response
  // carries `server: cloudflare`). Trusting a fixed hop count (e.g. `1`)
  // picks the wrong X-Forwarded-For entry depending on which edge node
  // routes a given request, which in production caused express-rate-limit
  // to key requests from the same client into different buckets almost at
  // random (RateLimit-Remaining jumped 7 -> 6 -> 12 across three
  // consecutive requests) — effectively no real throttling. Trusting the
  // whole chain (`true`) takes the left-most entry, the original client,
  // correctly regardless of how many hops are actually in front of it.
  app.set('trust proxy', true);

  app.use(express.json());

  app.get('/api/health', (_req, res) => {
    res.json({ ok: true });
  });

  // POST /api/audits spends real compute (a headless browser run) and
  // POST /api/summary spends real API quota (an LLM call) — the two routes
  // worth throttling once this is publicly reachable. Not applied to
  // /api/health, since hosting platforms poll that for liveness.
  // Skipped under the test suite (NODE_ENV=test, set in package.json's
  // `test` script) so the suite's own request volume never has to stay
  // under whatever this limit is.
  const apiLimiter = rateLimit({
    windowMs: 15 * 60 * 1000, // 15 minutes
    limit: 20, // generous for a portfolio demo, not for scripted abuse
    standardHeaders: true,
    legacyHeaders: false,
    skip: () => process.env.NODE_ENV === 'test',
    message: { error: 'Too many requests — please try again in a few minutes.' },
  });

  app.use(['/api/audits', '/api/summary'], apiLimiter);

  app.use('/api', auditsRouter);
  app.use('/api', summaryRouter);

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
