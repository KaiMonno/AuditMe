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

  const browser = await browserType.launch({
    headless: options.headless !== false,
  });

  try {
    // Isolated context so @axe-core/playwright can open a helper page
    // for axe.finishRun() (it calls context.newPage()).
    const context = await browser.newContext();
    const page = await context.newPage();
    await attachChecks(page, findings);
    await page.goto(url, {
      waitUntil: 'load',
      timeout: options.timeout ?? 30000,
    });
    await runPostLoadChecks(page, findings);
    return buildResult(url, findings);
  } finally {
    await browser.close();
  }
}

module.exports = { runAudit };
