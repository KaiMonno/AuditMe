const { AxeBuilder } = require('@axe-core/playwright');

/** @typedef {import('./types').Finding} Finding */

/** @type {Finding[]} */
const findings = [];

const IMPACT_TO_SEVERITY = {
  critical: 'error',
  serious: 'error',
  moderate: 'warning',
  minor: 'info',
};

/**
 * Axe needs a loaded page; nothing to attach before navigation.
 * @param {import('playwright').Page} _page
 */
async function setup(_page) {}

/**
 * Run axe-core against the current page and map each failing node to a Finding.
 * One finding per node (not per rule) so the HTML report can show where to look.
 *
 * Overlap: axe `image-alt` can duplicate metadata `missing-img-alt`. That is
 * intentional — metadata is an SEO-oriented presence check; axe is WCAG.
 *
 * @param {import('playwright').Page} page
 */
async function run(page) {
  const results = await new AxeBuilder({ page }).analyze();

  for (const violation of results.violations) {
    const severity = IMPACT_TO_SEVERITY[violation.impact] || 'warning';

    for (const node of violation.nodes) {
      findings.push({
        category: 'accessibility',
        rule: violation.id,
        severity,
        message: `${violation.help}. ${node.failureSummary || violation.description}`,
        url: page.url(),
      });
    }
  }
}

function getFindings() {
  return findings;
}

function reset() {
  findings.length = 0;
}

module.exports = { setup, run, getFindings, reset };
