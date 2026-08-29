/** @typedef {import('./types').Finding} Finding */

/** @type {Finding[]} */
const findings = [];

/**
 * Inspect page DOM/metadata after navigation (title, meta tags, OG tags, etc.).
 * Unlike functional checks, most metadata checks run after the page has loaded.
 *
 * @param {import('playwright').Page} page
 */
async function setup(page) {
  // TODO: run post-load DOM inspection
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
