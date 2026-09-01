const { describe, test, before, after } = require('node:test');
const assert = require('node:assert/strict');
const { chromium } = require('playwright');
const { metadata } = require('../checks');
const { startLocalServer } = require('./helpers/localServer');

describe('metadata checks', () => {
  let browser;
  let server;

  before(async () => {
    browser = await chromium.launch();
    server = await startLocalServer();
  });

  after(async () => {
    await browser.close();
    await server.close();
  });

  test('flags missing title, description, canonical, OG tags, and img alt', async () => {
    const context = await browser.newContext();
    const page = await context.newPage();
    const findings = [];
    await metadata.setup(page, findings);
    await page.goto(`${server.url}/fixtures/metadata-missing.html`);
    await metadata.run(page, findings);

    const rules = findings.map((f) => f.rule);
    assert.ok(rules.includes('missing-title'));
    assert.ok(rules.includes('missing-meta-description'));
    assert.ok(rules.includes('missing-canonical'));
    assert.ok(rules.includes('missing-og-title'));
    assert.ok(rules.includes('missing-og-description'));
    assert.ok(rules.includes('missing-og-image'));
    assert.ok(rules.includes('missing-img-alt'));

    await page.close();
  });

  test('does not flag a page with complete metadata and alt text', async () => {
    const context = await browser.newContext();
    const page = await context.newPage();
    const findings = [];
    await metadata.setup(page, findings);
    await page.goto(`${server.url}/fixtures/metadata-complete.html`);
    await metadata.run(page, findings);

    assert.deepEqual(findings, []);
    await page.close();
  });
});
