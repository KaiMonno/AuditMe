const { chromium, firefox, webkit } = require('playwright');
const { attachChecks, runPostLoadChecks } = require('../checks');
const { buildResult } = require('../reports');

const BROWSERS = { chromium, firefox, webkit };

/**
 * Launch a browser, run all check modules, and return a structured result.
 *
 * Findings are collected in an array scoped to this call (not module-level
 * state), so concurrent runAudit() calls do not interfere with each other.
 *
 * @param {string} url
 * @param {{ browser?: string, headless?: boolean, timeout?: number }} [options]
 */
async function runAudit(url, options = {}) {
  const browserName = options.browser || 'chromium';
  const browserType = BROWSERS[browserName];

  if (!browserType) {
    throw new Error(`Unsupported browser: ${browserName}. Use chromium, firefox, or webkit.`);
  }

  /** @type {import('../checks/types').Finding[]} */
  const findings = [];

  // Docker's default /dev/shm is only 64MB, which is too small for
  // Chromium's shared-memory usage on complex pages — it silently falls
  // back to disk-backed shared memory, which is markedly slower. Verified
  // in the actual production container (0.5 CPU / 512MB, matching the
  // free-tier host): --disable-dev-shm-usage cut browser launch time from
  // ~895ms to ~290ms (findings unchanged). Chromium-specific flag, so only
  // applied for that engine.
  const launchArgs = browserName === 'chromium' ? ['--disable-dev-shm-usage'] : [];

  const browser = await browserType.launch({
    headless: options.headless !== false,
    args: launchArgs,
  });

  try {
    // Isolated context so @axe-core/playwright can open a helper page
    // for axe.finishRun() (it calls context.newPage()).
    const context = await browser.newContext();
    const page = await context.newPage();
    await attachChecks(page, findings);
    // 'domcontentloaded' rather than 'load': the latter blocks until every
    // subresource finishes (ads, trackers, images), which is the dominant
    // cost on heavy sites (measured ~2.6s of a ~3.6s audit on a
    // content-heavy news homepage). The functional check's response/
    // pageerror listeners stay attached regardless of which event we wait
    // on, so this doesn't change what page.goto() itself detects — the
    // trade-off is a shorter window (bounded by how long the post-load
    // checks below take) for slow subresources to still fail before the
    // browser closes and those listeners stop mattering.
    await page.goto(url, {
      waitUntil: 'domcontentloaded',
      timeout: options.timeout ?? 30000,
    });
    await runPostLoadChecks(page, findings);
    return buildResult(url, findings);
  } finally {
    await browser.close();
  }
}

module.exports = { runAudit };
