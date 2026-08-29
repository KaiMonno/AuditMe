/**
 * Serialize audit results as JSON.
 * Structured output makes this tool easy to pipe into CI or other tooling.
 *
 * @param {{ url: string, findings: import('../checks/types').Finding[] }} result
 * @returns {string}
 */
function formatJson(result) {
  return JSON.stringify(result, null, 2);
}

module.exports = { formatJson };
