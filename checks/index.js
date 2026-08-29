const functional = require('./functional');
const metadata = require('./metadata');
const accessibility = require('./accessibility');

const modules = [functional, metadata, accessibility];

/**
 * Register all check modules against a Playwright page.
 * Must be called before navigation so event listeners are in place.
 *
 * @param {import('playwright').Page} page
 */
async function runAllChecks(page) {
  for (const mod of modules) {
    await mod.setup(page);
  }
}

/**
 * Gather findings from every check module.
 * @returns {import('./types').Finding[]}
 */
function collectFindings() {
  return modules.flatMap((mod) => mod.getFindings());
}

/** Reset all modules — primarily for unit tests. */
function resetAll() {
  for (const mod of modules) {
    mod.reset();
  }
}

module.exports = {
  runAllChecks,
  collectFindings,
  resetAll,
  functional,
  metadata,
  accessibility,
};
