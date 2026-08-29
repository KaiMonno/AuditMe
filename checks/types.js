/**
 * Shared shape for audit findings across all check modules.
 * Keeping this in one place so report formatters and tests can rely on a
 * consistent contract as checks are implemented.
 *
 * @typedef {Object} Finding
 * @property {'functional' | 'metadata' | 'accessibility'} category
 * @property {string} rule - Stable identifier, e.g. 'http-error-response'
 * @property {'error' | 'warning' | 'info'} severity
 * @property {string} message - Human-readable description
 * @property {string} [url] - Related resource URL, when applicable
 */

module.exports = {};
