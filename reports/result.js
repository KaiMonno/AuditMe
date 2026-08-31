/** @typedef {import('../checks/types').Finding} Finding */

/**
 * Wrap raw findings in a stable report object formatters and CI can consume.
 *
 * @param {string} url
 * @param {Finding[]} findings
 */
function buildResult(url, findings) {
  const summary = { error: 0, warning: 0, info: 0, total: findings.length };

  for (const finding of findings) {
    if (Object.prototype.hasOwnProperty.call(summary, finding.severity)) {
      summary[finding.severity] += 1;
    }
  }

  return {
    url,
    auditedAt: new Date().toISOString(),
    summary,
    findings,
  };
}

module.exports = { buildResult };
