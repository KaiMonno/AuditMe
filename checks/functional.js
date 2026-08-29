/** @typedef {import('./types').Finding} Finding */

/** @type {Finding[]} */
const findings = [];

/**
 * Register Playwright listeners for functional checks.
 * Must run before page.goto() — response/pageerror events that fire during
 * navigation would otherwise be missed.
 *
 * @param {import('playwright').Page} page
 */
async function setup(page) {
  // 'response' fires for every HTTP response the page receives: the main
  // document and subresources (scripts, CSS, images, XHR/fetch). Status is
  // that specific response (redirect hops are separate 3xx events, so they
  // are not flagged). Failed TCP/DNS requests never produce a response —
  // those would need page.on('requestfailed'), which we do not collect yet.
  page.on('response', (response) => {
    const status = response.status();
    if (status < 400) return;

    findings.push({
      category: 'functional',
      rule: 'http-error-response',
      severity: 'error',
      message: `HTTP ${status} ${response.statusText() || ''}`.trim(),
      url: response.url(),
    });
  });

  // 'pageerror' is uncaught JavaScript exceptions in the page. Distinct from
  // page.on('error'), which is a renderer/page crash, and from console
  // messages (console.error does not throw).
  page.on('pageerror', (error) => {
    findings.push({
      category: 'functional',
      rule: 'uncaught-js-error',
      severity: 'error',
      message: error.message,
    });
  });
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
