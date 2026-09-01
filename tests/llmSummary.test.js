const { describe, test, afterEach } = require('node:test');
const assert = require('node:assert/strict');
const {
  buildPrompt,
  generateSummary,
  getApiKey,
  MissingApiKeyError,
  MAX_FINDINGS_IN_PROMPT,
} = require('../lib/llmSummary');

const CLEAN_RESULT = {
  url: 'https://example.com',
  auditedAt: '2026-01-01T00:00:00.000Z',
  summary: { error: 0, warning: 0, info: 0, total: 0 },
  findings: [],
};

function makeFinding(severity, message = 'issue', category = 'metadata') {
  return { category, rule: 'some-rule', severity, message };
}

function withApiKey(value, fn) {
  const original = process.env.GEMINI_API_KEY;
  if (value === undefined) delete process.env.GEMINI_API_KEY;
  else process.env.GEMINI_API_KEY = value;

  return Promise.resolve()
    .then(fn)
    .finally(() => {
      if (original === undefined) delete process.env.GEMINI_API_KEY;
      else process.env.GEMINI_API_KEY = original;
    });
}

describe('llmSummary', () => {
  describe('buildPrompt', () => {
    test('clean audit produces a short all-clear prompt', () => {
      const prompt = buildPrompt(CLEAN_RESULT);
      assert.match(prompt, /example\.com/);
      assert.match(prompt, /no issues/);
    });

    test("includes each finding's message and severity", () => {
      const result = {
        ...CLEAN_RESULT,
        findings: [
          makeFinding('error', 'HTTP 500 Internal Server Error'),
          makeFinding('warning', 'Missing meta description'),
        ],
      };
      const prompt = buildPrompt(result);
      assert.match(prompt, /HTTP 500 Internal Server Error/);
      assert.match(prompt, /Missing meta description/);
      assert.match(prompt, /\[error\]/);
      assert.match(prompt, /\[warning\]/);
    });

    test('orders errors before warnings before info', () => {
      const result = {
        ...CLEAN_RESULT,
        findings: [
          makeFinding('info', 'an info item'),
          makeFinding('warning', 'a warning item'),
          makeFinding('error', 'an error item'),
        ],
      };
      const prompt = buildPrompt(result);
      assert.ok(prompt.indexOf('an error item') < prompt.indexOf('a warning item'));
      assert.ok(prompt.indexOf('a warning item') < prompt.indexOf('an info item'));
    });

    test('caps the number of findings and notes how many were omitted', () => {
      const findings = Array.from({ length: MAX_FINDINGS_IN_PROMPT + 5 }, (_, i) =>
        makeFinding('warning', `issue ${i}`)
      );
      const prompt = buildPrompt({ ...CLEAN_RESULT, findings });

      assert.match(prompt, /issue 0\b/);
      assert.match(prompt, new RegExp(`issue ${MAX_FINDINGS_IN_PROMPT - 1}\\b`));
      assert.ok(!prompt.includes(`issue ${MAX_FINDINGS_IN_PROMPT}`));
      assert.match(prompt, /5 more finding\(s\) not shown/);
    });

    test('asks for a plain-English ranked summary', () => {
      const prompt = buildPrompt({ ...CLEAN_RESULT, findings: [makeFinding('error')] });
      assert.match(prompt, /plain-English|plain English/);
      assert.match(prompt, /200 words/);
    });
  });

  describe('getApiKey', () => {
    afterEach(() => {
      delete process.env.GEMINI_API_KEY;
    });

    test('returns the configured key', () => {
      process.env.GEMINI_API_KEY = 'test-key-123';
      assert.equal(getApiKey(), 'test-key-123');
    });

    test('throws when unset', () => {
      delete process.env.GEMINI_API_KEY;
      assert.throws(() => getApiKey(), MissingApiKeyError);
    });
  });

  describe('generateSummary', () => {
    test('returns the model response text', async () => {
      await withApiKey('test-key', async () => {
        const fetchImpl = async () => ({
          ok: true,
          json: async () => ({
            candidates: [{ content: { parts: [{ text: 'Fix the broken link first.' }] } }],
          }),
        });

        const summary = await generateSummary(CLEAN_RESULT, { fetchImpl });
        assert.equal(summary, 'Fix the broken link first.');
      });
    });

    test('joins non-thought parts and skips thought parts', async () => {
      await withApiKey('test-key', async () => {
        const fetchImpl = async () => ({
          ok: true,
          json: async () => ({
            candidates: [
              {
                content: {
                  parts: [
                    { text: 'reasoning...', thought: true },
                    { text: 'The real answer.' },
                  ],
                },
              },
            ],
          }),
        });

        const summary = await generateSummary(CLEAN_RESULT, { fetchImpl });
        assert.equal(summary, 'The real answer.');
      });
    });

    test('sends the built prompt to the model', async () => {
      await withApiKey('test-key', async () => {
        let sentBody;
        const fetchImpl = async (_url, options) => {
          sentBody = JSON.parse(options.body);
          return {
            ok: true,
            json: async () => ({ candidates: [{ content: { parts: [{ text: 'ok' }] } }] }),
          };
        };

        await generateSummary(
          { ...CLEAN_RESULT, findings: [makeFinding('error', 'a distinctive message')] },
          { fetchImpl }
        );

        assert.match(sentBody.contents[0].parts[0].text, /a distinctive message/);
      });
    });

    test('includes the api key and model in the request URL', async () => {
      await withApiKey('test-key', async () => {
        let calledUrl;
        const fetchImpl = async (url) => {
          calledUrl = url;
          return {
            ok: true,
            json: async () => ({ candidates: [{ content: { parts: [{ text: 'ok' }] } }] }),
          };
        };

        await generateSummary(CLEAN_RESULT, { fetchImpl, model: 'gemini-test-model' });

        assert.match(calledUrl, /models\/gemini-test-model:generateContent/);
        assert.match(calledUrl, /key=test-key/);
      });
    });

    test('returns a readable message when the API call fails', async () => {
      await withApiKey('test-key', async () => {
        const fetchImpl = async () => ({
          ok: false,
          status: 429,
          json: async () => ({ error: { message: 'rate limited' } }),
        });

        const summary = await generateSummary(CLEAN_RESULT, { fetchImpl });
        assert.match(summary, /unavailable/);
        assert.match(summary, /rate limited/);
      });
    });

    test('returns a readable message when no API key is configured', async () => {
      await withApiKey(undefined, async () => {
        const summary = await generateSummary(CLEAN_RESULT);
        assert.match(summary, /unavailable/);
        assert.match(summary, /GEMINI_API_KEY/);
      });
    });
  });
});
