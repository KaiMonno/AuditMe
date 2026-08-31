const { chromium, firefox, webkit } = require('playwright');
const {
  attachChecks,
  runPostLoadChecks,
  collectFindings,
  resetAll,
} = require('../checks');
const { buildResult } = require('../reports');

const BROWSERS = { chromium, firefox, webkit };

/**
 * Launch a browser, run all check modules, and return a structured result.
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

  // Module findings are process-global; clear so consecutive runs do not leak.
  resetAll();

  const browser = await browserType.launch({
    headless: options.headless !== false,
  });

  try {
    // Isolated context so @axe-core/playwright can open a helper page
    // for axe.finishRun() (it calls context.newPage()).
    const context = await browser.newContext();
    const page = await context.newPage();
    await attachChecks(page);
    await page.goto(url, {
      waitUntil: 'load',
      timeout: options.timeout ?? 30000,
    });
    await runPostLoadChecks(page);
    return buildResult(url, collectFindings());
  } finally {
    await browser.close();
  }
}

module.exports = { runAudit };
