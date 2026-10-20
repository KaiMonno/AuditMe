const { chromium, firefox, webkit } = require('playwright');
const { attachChecks, runPostLoadChecks } = require('../checks');
const { buildResult } = require('../reports');

const BROWSERS = { chromium, firefox, webkit };

// Each audit launches its own full browser process. On a CPU/memory-
// constrained host, running more than one at a time doesn't make audits
// faster — it makes every one of them slower (they fight over the same
// tiny CPU share) AND risks OOM. Measured directly against the actual
// production container, resource-limited to match Render's free tier
// (0.15 CPU / 512MB, the real numbers from its dashboard): 3 concurrent
// audits against ordinary (not even particularly heavy) sites pushed
// memory from a 76MB baseline to 312MB in under a minute, while CPU
// stayed pegged at the same ~15% regardless of how many were running at
// once — no throughput gained, just more memory pressure. Serializing
// execution (default: 1 at a time) is a pure win on a host this
// constrained, not a trade-off. Overridable via MAX_CONCURRENT_AUDITS for
// a beefier host where running more than one at once would actually help.
const MAX_CONCURRENT_AUDITS = Number(process.env.MAX_CONCURRENT_AUDITS) || 1;
let activeAudits = 0;
const auditQueue = [];

function runQueued(fn) {
  return new Promise((resolve, reject) => {
    auditQueue.push({ fn, resolve, reject });
    pumpQueue();
  });
}

function pumpQueue() {
  if (activeAudits >= MAX_CONCURRENT_AUDITS || auditQueue.length === 0) return;
  activeAudits += 1;
  const { fn, resolve, reject } = auditQueue.shift();
  fn()
    .then(resolve, reject)
    .finally(() => {
      activeAudits -= 1;
      pumpQueue();
    });
}

/**
 * Launch a browser, run all check modules, and return a structured result.
 *
 * Findings are collected in an array scoped to this call (not module-level
 * state), so concurrent runAudit() calls do not interfere with each other.
 * Actual execution is serialized (see MAX_CONCURRENT_AUDITS above) — calls
 * queue rather than running simultaneously.
 *
 * @param {string} url
 * @param {{ browser?: string, headless?: boolean, timeout?: number }} [options]
 */
function runAudit(url, options = {}) {
  return runQueued(() => runAuditNow(url, options));
}

// Default navigation timeout — configurable because the right value is
// host-dependent, not a constant: measured directly on the production
// container resource-limited to Render's free-tier numbers (0.15 CPU),
// even example.com took 25-32s, so 30000 (fine on a normal machine) is
// already borderline there. Rather than hardcode a value tuned to one
// host, this is adjustable per-deployment via an env var.
const DEFAULT_NAV_TIMEOUT_MS = Number(process.env.AUDIT_NAV_TIMEOUT_MS) || 30000;

async function runAuditNow(url, options = {}) {
  const browserName = options.browser || 'chromium';
  const browserType = BROWSERS[browserName];

  if (!browserType) {
    throw new Error(`Unsupported browser: ${browserName}. Use chromium, firefox, or webkit.`);
  }

  /** @type {import('../checks/types').Finding[]} */
  const findings = [];

  // Docker's default /dev/shm is only 64MB, which is too small for
  // Chromium's shared-memory usage on complex pages — it silently falls
  // back to disk-backed shared memory, which is markedly slower. Verified
  // in the actual production container (0.5 CPU / 512MB, matching the
  // free-tier host): --disable-dev-shm-usage cut browser launch time from
  // ~895ms to ~290ms (findings unchanged). Chromium-specific flag, so only
  // applied for that engine.
  const launchArgs = browserName === 'chromium' ? ['--disable-dev-shm-usage'] : [];

  const navTimeoutMs = options.timeout ?? DEFAULT_NAV_TIMEOUT_MS;
  // page.goto()'s own timeout only bounds navigation — it does not bound
  // runPostLoadChecks() (metadata + axe), which can run long on a large/
  // complex DOM regardless of how fast navigation was. Verified directly:
  // a real Wikipedia article didn't finish auditing within 120s on a
  // 0.15-CPU container even with images/fonts/media blocked from loading,
  // confirming the bottleneck there is CPU-bound DOM/rule evaluation, not
  // network weight — so this needs its own bound, not a network-side fix.
  // Racing against the whole flow and force-closing the browser on timeout
  // is what actually frees the stuck resources — Promise.race alone would
  // give up waiting but leave the real browser process (and a hung axe
  // scan inside it) running in the background.
  const overallTimeoutMs = options.overallTimeout ?? navTimeoutMs * 2;

  const browser = await browserType.launch({
    headless: options.headless !== false,
    args: launchArgs,
  });

  let timeoutHandle;
  try {
    const work = (async () => {
      // Isolated context so @axe-core/playwright can open a helper page
      // for axe.finishRun() (it calls context.newPage()).
      const context = await browser.newContext();
      const page = await context.newPage();
      await attachChecks(page, findings);
      // 'domcontentloaded' rather than 'load': the latter blocks until
      // every subresource finishes (ads, trackers, images), which is the
      // dominant cost on heavy sites (measured ~2.6s of a ~3.6s audit on
      // a content-heavy news homepage). The functional check's response/
      // pageerror listeners stay attached regardless of which event we
      // wait on, so this doesn't change what page.goto() itself detects
      // — the trade-off is a shorter window (bounded by how long the
      // post-load checks below take) for slow subresources to still fail
      // before the browser closes and those listeners stop mattering.
      await page.goto(url, { waitUntil: 'domcontentloaded', timeout: navTimeoutMs });
      await runPostLoadChecks(page, findings);
      return buildResult(url, findings);
    })();

    const timeout = new Promise((_, reject) => {
      timeoutHandle = setTimeout(() => {
        reject(
          new Error(
            `Audit of ${url} did not complete within ${overallTimeoutMs}ms (the page may be too ` +
              'large or complex for the current timeout — see AUDIT_NAV_TIMEOUT_MS)'
          )
        );
      }, overallTimeoutMs);
    });

    return await Promise.race([work, timeout]);
  } finally {
    clearTimeout(timeoutHandle);
    // Always force-close, even if `work` above is technically still
    // pending (the timeout path) — closing the browser is what actually
    // terminates a stuck Chromium process and frees its memory/CPU,
    // rather than just giving up on awaiting it from this side.
    await browser.close();
  }
}

module.exports = { runAudit };
