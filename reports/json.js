/**
 * Serialize audit results as JSON for piping into CI or other tooling.
 *
 * @param {ReturnType<import('./result').buildResult>} result
 * @returns {string}
 */
function formatJson(result) {
  return JSON.stringify(result, null, 2);
}

module.exports = { formatJson };
