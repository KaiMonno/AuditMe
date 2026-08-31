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
});
