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
});
