const functional = require('./functional');
const metadata = require('./metadata');
const accessibility = require('./accessibility');

const modules = [functional, metadata, accessibility];

/**
 * Register listeners that must exist before navigation (HTTP/JS errors).
 * Call this before page.goto().
 *
 * @param {import('playwright').Page} page
 * @param {import('./types').Finding[]} findings - shared collector for this audit run
 */
async function attachChecks(page, findings) {
  for (const mod of modules) {
    await mod.setup(page, findings);
  }
}

/**
 * Run checks that inspect the loaded DOM (metadata, axe).
 * Call this after page.goto().
 *
 * Runs concurrently rather than sequentially — each module's run() is an
 * independent read of the page (a page.evaluate() for metadata, an
 * injected script for axe), and both just push onto the shared `findings`
 * array, which is safe since JS execution (and Array#push) is single-
 * threaded. Measured ~14% faster on a DOM-heavy page with identical
 * findings either way.
 *
 * @param {import('playwright').Page} page
 * @param {import('./types').Finding[]} findings - shared collector for this audit run
 */
async function runPostLoadChecks(page, findings) {
  await Promise.all(
    modules
      .filter((mod) => typeof mod.run === 'function')
      .map((mod) => mod.run(page, findings))
  );
}

module.exports = {
  attachChecks,
  runPostLoadChecks,
  functional,
  metadata,
  accessibility,
};
