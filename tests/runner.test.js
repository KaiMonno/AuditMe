const { describe, test, before, after } = require('node:test');
const assert = require('node:assert/strict');
const { runAudit } = require('../lib/runner');
const { startLocalServer } = require('./helpers/localServer');

describe('runAudit', () => {
  let server;

  before(async () => {
    server = await startLocalServer();
  });

  after(async () => {
    await server.close();
  });

  test('collects functional, metadata, and accessibility findings together', async () => {
    const result = await runAudit(`${server.url}/500`);

    assert.equal(result.url, `${server.url}/500`);
    assert.ok(result.summary.total >= 1);
    assert.ok(
      result.findings.some((f) => f.rule === 'http-error-response'),
      'expected HTTP 500 finding'
    );
    assert.ok(
      result.findings.some((f) => f.category === 'metadata'),
      'expected metadata findings on a bare 500 page'
    );
  });

  test('concurrent audits do not leak findings into each other', async () => {
    // Regression test: check modules used to store findings in module-level
    // arrays shared across every runAudit() call. Two audits running at the
    // same time (as they would behind a web server) could interleave their
    // findings. Findings are now scoped per-call, so a clean page audited
    // alongside a failing one should come back clean.
    const [clean, broken] = await Promise.all([
      runAudit(`${server.url}/fixtures/metadata-complete.html`),
      runAudit(`${server.url}/500`),
    ]);

    assert.ok(
      !clean.findings.some((f) => f.rule === 'http-error-response'),
      'clean audit should not see the other audit\'s HTTP 500 finding'
    );
    assert.ok(
      broken.findings.some((f) => f.rule === 'http-error-response'),
      'expected HTTP 500 finding on the broken audit'
    );
  });

  test('serializes audits so running 3 at once takes notably longer than one', async () => {
    // Regression test for a real production incident: unbounded concurrent
    // audits each launch a full browser process, which on a CPU/memory-
    // constrained host causes OOM after just a few overlapping requests
    // (measured directly: 3 concurrent audits pushed a 512MB-limited
    // container from 76MB to 312MB in under a minute). Default
    // MAX_CONCURRENT_AUDITS=1 means calls queue instead of overlapping —
    // verified here by timing: if they ran concurrently, 3 at once would
    // take about as long as 1; serialized, it should take notably longer.
    const t0 = Date.now();
    await runAudit(`${server.url}/ok`);
    const oneAuditMs = Date.now() - t0;

    const t1 = Date.now();
    await Promise.all([
      runAudit(`${server.url}/ok`),
      runAudit(`${server.url}/ok`),
      runAudit(`${server.url}/ok`),
    ]);
    const threeAuditsMs = Date.now() - t1;

    assert.ok(
      threeAuditsMs > oneAuditMs * 2,
      `expected 3 serialized audits (${threeAuditsMs}ms) to take notably longer than ` +
        `2x one audit (${oneAuditMs}ms) — if this fails, audits may be running concurrently again`
    );
  });

  test('bounds the whole audit (not just navigation) with an overall timeout', async () => {
    // page.goto()'s own timeout only bounds navigation, not the metadata/
    // axe checks that run after it — a page complex enough to make axe
    // run long would otherwise hang indefinitely. An artificially tiny
    // overallTimeout against an otherwise-fast local page proves the
    // whole-flow bound actually fires, without needing a real slow site.
    await assert.rejects(
      runAudit(`${server.url}/ok`, { overallTimeout: 10 }),
      /did not complete within 10ms/
    );
  });

  test('releases the concurrency slot and browser after a timeout', async () => {
    // If the timeout path didn't properly close the browser and release
    // the slot (see the `finally` block in lib/runner.js), this next call
    // would hang forever waiting on a queue that never drains.
    await assert.rejects(runAudit(`${server.url}/ok`, { overallTimeout: 10 }));

    const result = await runAudit(`${server.url}/ok`);
    assert.equal(result.url, `${server.url}/ok`);
  });
});
