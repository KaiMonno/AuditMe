const functional = require('./functional');
const metadata = require('./metadata');
const accessibility = require('./accessibility');

const modules = [functional, metadata, accessibility];

/**
 * Register listeners that must exist before navigation (HTTP/JS errors).
 * Call this before page.goto().
 *
 * @param {import('playwright').Page} page
 */
async function attachChecks(page) {
  for (const mod of modules) {
    await mod.setup(page);
  }
}

/**
 * Run checks that inspect the loaded DOM (metadata, axe).
 * Call this after page.goto().
 *
 * @param {import('playwright').Page} page
 */
async function runPostLoadChecks(page) {
  for (const mod of modules) {
    if (typeof mod.run === 'function') {
      await mod.run(page);
    }
  }
}

/**
 * @deprecated Use attachChecks — kept so older call sites still work.
 */
async function runAllChecks(page) {
  return attachChecks(page);
}

/**
 * Gather findings from every check module.
 * @returns {import('./types').Finding[]}
 */
function collectFindings() {
  return modules.flatMap((mod) => mod.getFindings());
}

/** Reset all modules — primarily for unit tests and consecutive CLI runs. */
function resetAll() {
  for (const mod of modules) {
    mod.reset();
  }
}

module.exports = {
  attachChecks,
  runPostLoadChecks,
  runAllChecks,
  collectFindings,
  resetAll,
  functional,
  metadata,
  accessibility,
};
