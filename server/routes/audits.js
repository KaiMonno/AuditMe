const { Router } = require('express');
const { runAudit } = require('../../lib/runner');

const ALLOWED_PROTOCOLS = new Set(['http:', 'https:']);
const ALLOWED_BROWSERS = new Set(['chromium', 'firefox', 'webkit']);

/**
 * Parse and validate the target URL from a request body.
 * Only http/https are accepted — this server fetches whatever URL it's
 * given, so this is a minimal guard against obviously-wrong input
 * (file://, javascript:, etc). It is NOT full SSRF protection: it does not
 * block private/internal IP ranges or cloud metadata addresses. Fine for a
 * local dev tool; would need hardening before ever being exposed publicly.
 *
 * @returns {URL}
 * @throws {Error} with a `status` property for the route handler to use
 */
function parseTargetUrl(rawUrl) {
  if (typeof rawUrl !== 'string' || rawUrl.trim() === '') {
    const err = new Error('"url" is required');
    err.status = 400;
    throw err;
  }

  let parsed;
  try {
    parsed = new URL(rawUrl);
  } catch {
    const err = new Error(`"${rawUrl}" is not a valid URL`);
    err.status = 400;
    throw err;
  }

  if (!ALLOWED_PROTOCOLS.has(parsed.protocol)) {
    const err = new Error(`Unsupported URL protocol "${parsed.protocol}". Use http or https.`);
    err.status = 400;
    throw err;
  }

  return parsed;
}

const router = Router();

router.post('/audits', async (req, res) => {
  const body = req.body || {};

  let targetUrl;
  try {
    targetUrl = parseTargetUrl(body.url);
  } catch (err) {
    return res.status(err.status || 400).json({ error: err.message });
  }

  if (body.browser !== undefined && !ALLOWED_BROWSERS.has(body.browser)) {
    return res.status(400).json({
      error: `Unsupported browser "${body.browser}". Use chromium, firefox, or webkit.`,
    });
  }

  try {
    const result = await runAudit(targetUrl.href, {
      browser: body.browser,
      timeout: body.timeout,
    });
    res.json(result);
  } catch (err) {
    // runAudit failing means we couldn't complete an audit of the upstream
    // URL (bad host, navigation timeout, etc) — not a problem with this
    // server, so 502 rather than 500.
    res.status(502).json({ error: err.message });
  }
});

module.exports = router;
