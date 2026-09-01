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
 * @param {import('playwright').Page} page
 * @param {import('./types').Finding[]} findings - shared collector for this audit run
 */
async function runPostLoadChecks(page, findings) {
  for (const mod of modules) {
    if (typeof mod.run === 'function') {
      await mod.run(page, findings);
    }
  }
}

module.exports = {
  attachChecks,
  runPostLoadChecks,
  functional,
  metadata,
  accessibility,
};
