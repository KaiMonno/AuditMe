const { describe, test, before, after } = require('node:test');
const assert = require('node:assert/strict');
const { chromium } = require('playwright');
const { accessibility } = require('../checks');
const { startLocalServer } = require('./helpers/localServer');

describe('accessibility checks', () => {
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

  test('reports axe violations on a page with known a11y issues', async () => {
    const context = await browser.newContext();
    const page = await context.newPage();
    const findings = [];
    await accessibility.setup(page, findings);
    await page.goto(`${server.url}/fixtures/a11y-issues.html`);
    await accessibility.run(page, findings);

    const rules = new Set(findings.map((f) => f.rule));
    assert.ok(rules.has('html-has-lang'), 'expected html-has-lang');
    assert.ok(rules.has('image-alt'), 'expected image-alt');
    assert.ok(rules.has('button-name'), 'expected button-name');

    await page.close();
  });

  test('does not report html-has-lang on a page with lang set', async () => {
    const context = await browser.newContext();
    const page = await context.newPage();
    const findings = [];
    await accessibility.setup(page, findings);
    await page.goto(`${server.url}/fixtures/metadata-complete.html`);
    await accessibility.run(page, findings);

    const rules = findings.map((f) => f.rule);
    assert.ok(!rules.includes('html-has-lang'));
    assert.ok(!rules.includes('image-alt'));
    assert.ok(!rules.includes('button-name'));

    await page.close();
  });
});
