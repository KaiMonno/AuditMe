const { escapeHtml } = require('./escape');

/**
 * Render a self-contained HTML summary. Values are escaped so finding
 * messages/URLs cannot break the report markup.
 *
 * @param {ReturnType<import('./result').buildResult>} result
 * @returns {string}
 */
function formatHtml(result) {
  const summary = result.summary || { error: 0, warning: 0, info: 0, total: 0 };
  const rows =
    result.findings.length === 0
      ? `<tr><td colspan="5">No findings</td></tr>`
      : result.findings
          .map(
            (f) => `<tr class="${escapeHtml(f.severity)}">
      <td>${escapeHtml(f.severity)}</td>
      <td>${escapeHtml(f.category)}</td>
      <td>${escapeHtml(f.rule)}</td>
      <td>${escapeHtml(f.message)}</td>
      <td>${escapeHtml(f.url || '')}</td>
    </tr>`
          )
          .join('\n');

  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="utf-8">
  <title>AuditMe Report</title>
  <style>
    body { font-family: system-ui, sans-serif; margin: 2rem; color: #1a1a1a; }
    table { border-collapse: collapse; width: 100%; }
    th, td { border: 1px solid #ccc; padding: 0.5rem 0.75rem; text-align: left; vertical-align: top; }
    th { background: #f4f4f4; }
    .summary span { display: inline-block; margin-right: 1rem; }
    tr.error { background: #fdecea; }
    tr.warning { background: #fff8e1; }
    tr.info { background: #e8f4fd; }
  </style>
</head>
<body>
  <h1>AuditMe Report</h1>
  <p>URL: ${escapeHtml(result.url)}</p>
  <p>Audited at: ${escapeHtml(result.auditedAt || '')}</p>
  <p class="summary">
    <span>Total: ${summary.total}</span>
    <span>Errors: ${summary.error}</span>
    <span>Warnings: ${summary.warning}</span>
    <span>Info: ${summary.info}</span>
  </p>
  <table>
    <thead>
      <tr>
        <th>Severity</th>
        <th>Category</th>
        <th>Rule</th>
        <th>Message</th>
        <th>URL</th>
      </tr>
    </thead>
    <tbody>
      ${rows}
    </tbody>
  </table>
</body>
</html>`;
}

module.exports = { formatHtml };
