const { describe, test } = require('node:test');
const assert = require('node:assert/strict');
const { buildResult, formatJson, formatHtml } = require('../reports');

describe('report formatters', () => {
  const findings = [
    {
      category: 'functional',
      rule: 'http-error-response',
      severity: 'error',
      message: 'HTTP 500',
      url: 'https://example.com/500',
    },
    {
      category: 'metadata',
      rule: 'missing-title',
      severity: 'warning',
      message: 'missing <title> & friends',
    },
  ];

  test('buildResult counts severities', () => {
    const result = buildResult('https://example.com', findings);
    assert.equal(result.url, 'https://example.com');
    assert.equal(result.summary.total, 2);
    assert.equal(result.summary.error, 1);
    assert.equal(result.summary.warning, 1);
    assert.equal(result.summary.info, 0);
    assert.ok(result.auditedAt);
  });

  test('formatJson includes summary and findings', () => {
    const json = JSON.parse(formatJson(buildResult('https://example.com', findings)));
    assert.equal(json.findings.length, 2);
    assert.equal(json.summary.error, 1);
  });

  test('formatHtml escapes finding text', () => {
    const html = formatHtml(buildResult('https://example.com/?q=<x>', findings));
    assert.ok(html.includes('missing &lt;title&gt; &amp; friends'));
    assert.ok(html.includes('https://example.com/?q=&lt;x&gt;'));
    assert.ok(!html.includes('missing <title> & friends'));
  });
});
