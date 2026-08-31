const { describe, test, before, after, beforeEach } = require('node:test');
const assert = require('node:assert/strict');
const { chromium } = require('playwright');
const { functional, resetAll } = require('../checks');
const { startLocalServer } = require('./helpers/localServer');

describe('functional checks', () => {
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

  test('getFindings starts empty after reset', () => {
    assert.deepEqual(functional.getFindings(), []);
  });

  test('flags the main document when status is 500', async () => {
    const context = await browser.newContext();
    const page = await context.newPage();
    await functional.setup(page);
    await page.goto(`${server.url}/500`);

    const httpFindings = functional
      .getFindings()
      .filter((f) => f.rule === 'http-error-response');

    assert.equal(httpFindings.length, 1);
    assert.equal(httpFindings[0].category, 'functional');
    assert.equal(httpFindings[0].severity, 'error');
    assert.match(httpFindings[0].message, /HTTP 500/);
    assert.equal(httpFindings[0].url, `${server.url}/500`);

    await page.close();
  });

  test('does not flag a 200 document response', async () => {
    const context = await browser.newContext();
    const page = await context.newPage();
    await functional.setup(page);
    await page.goto(`${server.url}/ok`);

    const httpFindings = functional
      .getFindings()
      .filter((f) => f.rule === 'http-error-response');

    assert.equal(httpFindings.length, 0);
    await page.close();
  });

  test('flags uncaught JS errors via pageerror', async () => {
    const context = await browser.newContext();
    const page = await context.newPage();
    await functional.setup(page);
    await page.goto(`${server.url}/js-error`);

    const jsFindings = functional
      .getFindings()
      .filter((f) => f.rule === 'uncaught-js-error');

    assert.equal(jsFindings.length, 1);
    assert.equal(jsFindings[0].category, 'functional');
    assert.equal(jsFindings[0].severity, 'error');
    assert.match(jsFindings[0].message, /intentional uncaught error/);

    await page.close();
  });
});
