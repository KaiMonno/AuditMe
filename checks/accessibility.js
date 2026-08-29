/** @typedef {import('./types').Finding} Finding */

/** @type {Finding[]} */
const findings = [];

/**
 * Run accessibility checks (future: @axe-core/playwright integration).
 *
 * @param {import('playwright').Page} page
 */
async function setup(page) {
  // TODO: integrate axe-core after functional + metadata checks are stable
}

/**
 * @returns {Finding[]}
 */
function getFindings() {
  return findings;
}

function reset() {
  findings.length = 0;
}

module.exports = { setup, getFindings, reset };
