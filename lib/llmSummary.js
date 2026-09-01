'use strict';

// JS reimplementation of the llm/summary.py prototype — see git history for
// the superseded Python version. Calls Gemini's REST API directly with
// fetch (Node has this built in since 18) instead of a second runtime.

const DEFAULT_MODEL = 'gemini-3.6-flash'; // gemini-2.5-flash 404s as of writing — see llm reimplementation notes
const MAX_FINDINGS_IN_PROMPT = 20; // cap so the prompt doesn't explode on a large audit
const SEVERITY_RANK = { error: 0, warning: 1, info: 2 };

class MissingApiKeyError extends Error {}

/**
 * Read the Gemini API key from the environment. Throws rather than
 * silently sending garbage requests with an empty key.
 */
function getApiKey() {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) {
    throw new MissingApiKeyError(
      'GEMINI_API_KEY is not set. Copy .env.example to .env and fill in a real key, ' +
        'or export GEMINI_API_KEY yourself. Never commit a real key to git.'
    );
  }
  return apiKey;
}

/**
 * Turn an AuditMe audit result into a plain-language prompt.
 *
 * `result` is the same shape reports/result.js's buildResult() produces:
 * {url, auditedAt, summary, findings}, where each finding is
 * {category, rule, severity, message, url?}.
 *
 * @param {{ url?: string, findings?: import('../checks/types').Finding[] }} result
 */
function buildPrompt(result) {
  const findings = result.findings || [];
  const url = result.url || 'the site';

  if (findings.length === 0) {
    return (
      `A website audit of ${url} found no issues. ` +
      'Write one short sentence confirming the site is clean.'
    );
  }

  // Errors first — those are what a non-technical owner most needs to hear
  // about. Array#sort is stable, so ties keep check-module order.
  const ordered = [...findings].sort(
    (a, b) => (SEVERITY_RANK[a.severity] ?? 3) - (SEVERITY_RANK[b.severity] ?? 3)
  );

  const lines = [`Here are the results of a website audit of ${url}:\n`];
  for (const finding of ordered.slice(0, MAX_FINDINGS_IN_PROMPT)) {
    const category = finding.category || 'general';
    const severity = finding.severity || 'info';
    const message = finding.message || '';
    lines.push(`  - [${severity}] (${category}) ${message}`);
  }

  const omitted = findings.length - Math.min(findings.length, MAX_FINDINGS_IN_PROMPT);
  if (omitted > 0) {
    lines.push(`  ...and ${omitted} more finding(s) not shown.`);
  }

  lines.push('');
  lines.push(
    'Summarize the most important issues in plain English for a non-technical ' +
      'site owner, and rank them by likely impact on user experience and SEO. ' +
      'Keep it under 200 words.'
  );

  return lines.join('\n');
}

/**
 * Extract the answer text from a generateContent response. Some models
 * (gemini-3.6-flash included) can emit a `thought` part alongside the
 * answer part — join every non-thought part's text rather than assume the
 * answer is always parts[0].
 */
function extractText(body) {
  const parts = body?.candidates?.[0]?.content?.parts || [];
  const text = parts
    .filter((part) => !part.thought)
    .map((part) => part.text || '')
    .join('')
    .trim();

  if (!text) {
    throw new Error('Gemini response did not include any text');
  }
  return text;
}

async function callGemini(prompt, { apiKey, model, fetchImpl }) {
  const url = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${apiKey}`;

  const res = await fetchImpl(url, {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({ contents: [{ parts: [{ text: prompt }] }] }),
  });

  const body = await res.json();

  if (!res.ok) {
    throw new Error(body?.error?.message || `HTTP ${res.status}`);
  }

  return extractText(body);
}

/**
 * Send the audit result to Gemini and return a prioritized plain-English
 * summary. Never throws — returns an error message string instead, so a
 * flaky API call doesn't take down a request that otherwise succeeded.
 *
 * `fetchImpl` is injectable so tests never need a real network call or API
 * key; defaults to the global fetch.
 *
 * @param {object} result
 * @param {{ fetchImpl?: typeof fetch, model?: string }} [opts]
 */
async function generateSummary(result, opts = {}) {
  const { fetchImpl = fetch, model = process.env.GEMINI_MODEL || DEFAULT_MODEL } = opts;
  const prompt = buildPrompt(result);

  try {
    const apiKey = getApiKey();
    return await callGemini(prompt, { apiKey, model, fetchImpl });
  } catch (err) {
    // A real version would distinguish rate-limit vs. auth vs. network
    // errors, but this is enough to keep the audit tool usable even if
    // the API call fails.
    return `(LLM summary unavailable: ${err.message})`;
  }
}

module.exports = {
  buildPrompt,
  generateSummary,
  getApiKey,
  MissingApiKeyError,
  DEFAULT_MODEL,
  MAX_FINDINGS_IN_PROMPT,
};
