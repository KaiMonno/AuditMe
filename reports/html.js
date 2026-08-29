/**
 * Render audit results as a simple HTML summary.
 * Full template/CSS can be expanded later; this stub establishes the interface.
 *
 * @param {{ url: string, findings: import('../checks/types').Finding[] }} result
 * @returns {string}
 */
function formatHtml(result) {
  const rows = result.findings
    .map(
      (f) =>
        `<tr><td>${f.severity}</td><td>${f.category}</td><td>${f.rule}</td><td>${f.message}</td></tr>`
    )
    .join('\n');

  return `<!DOCTYPE html>
<html lang="en">
<head><meta charset="utf-8"><title>AuditMe Report</title></head>
<body>
  <h1>AuditMe Report</h1>
  <p>URL: ${result.url}</p>
  <table border="1">
    <thead><tr><th>Severity</th><th>Category</th><th>Rule</th><th>Message</th></tr></thead>
    <tbody>${rows || '<tr><td colspan="4">No findings</td></tr>'}</tbody>
  </table>
</body>
</html>`;
}

module.exports = { formatHtml };
