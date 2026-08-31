const { describe, test, before, after, beforeEach } = require('node:test');
const assert = require('node:assert/strict');
const { chromium } = require('playwright');
const { metadata, resetAll } = require('../checks');
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

  beforeEach(() => {
    resetAll();
  });

  test('flags missing title, description, canonical, OG tags, and img alt', async () => {
    const context = await browser.newContext();
    const page = await context.newPage();
    await metadata.setup(page);
    await page.goto(`${server.url}/fixtures/metadata-missing.html`);
    await metadata.run(page);

    const rules = metadata.getFindings().map((f) => f.rule);
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
    await metadata.setup(page);
    await page.goto(`${server.url}/fixtures/metadata-complete.html`);
    await metadata.run(page);

    assert.deepEqual(metadata.getFindings(), []);
    await page.close();
  });
});
