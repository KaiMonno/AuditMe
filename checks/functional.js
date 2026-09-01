/** @typedef {import('./types').Finding} Finding */

/**
 * Register Playwright listeners for functional checks.
 * Must run before page.goto() — response/pageerror events that fire during
 * navigation would otherwise be missed.
 *
 * @param {import('playwright').Page} page
 * @param {Finding[]} findings - shared collector for this audit run
 */
async function setup(page, findings) {
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

/** No post-load work — functional findings come from events during navigation. */
async function run(_page, _findings) {}

module.exports = { setup, run };
