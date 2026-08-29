/** @typedef {import('./types').Finding} Finding */

/** @type {Finding[]} */
const findings = [];

/**
 * Register Playwright listeners for functional checks (HTTP errors, JS errors, etc.).
 * Call this before page.goto() so no responses are missed.
 *
 * @param {import('playwright').Page} page
 */
async function setup(page) {
  // TODO: page.on('response') — filter status >= 400
  // TODO: page.on('pageerror') — uncaught JS exceptions
}

/**
 * @returns {Finding[]}
 */
function getFindings() {
  return findings;
}

/**
 * Reset state between runs (useful in tests).
 */
function reset() {
  findings.length = 0;
}

module.exports = { setup, getFindings, reset };
