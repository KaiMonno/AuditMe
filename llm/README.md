# LLM summary (prototype)

Standalone Python module that takes an AuditMe audit result and asks Gemini
for a short, prioritized, plain-English summary. **Not wired into `audit.js`
or `server/` yet** — this is a prototype for the feature, matching the rest
of AuditMe's "the repository is the source of truth for what's implemented"
rule. Deciding how a Python step fits into an otherwise all-Node pipeline
(subprocess? reimplement in JS against the Gemini REST API?) is a real
architecture question for later, not something to answer implicitly by
building it this way.

## Setup

```bash
python3 -m venv llm/.venv
source llm/.venv/bin/activate      # Windows: llm\.venv\Scripts\activate
pip install -r llm/requirements.txt

cp llm/.env.example llm/.env
# edit llm/.env and set a real GEMINI_API_KEY — that file is gitignored,
# never commit a real key
```

## Usage

```bash
source llm/.venv/bin/activate
python llm/summary.py        # runs the manual smoke test with dummy data
python -m pytest llm/tests   # unit tests — mocked, no API key needed
```

## Design notes

- `build_prompt(result)` takes AuditMe's real result shape — the same
  `{url, auditedAt, summary, findings}` object `reports/result.js` builds on
  the Node side — not an invented shape. Findings are sorted errors-first
  and capped at `MAX_FINDINGS_IN_PROMPT` (20) so a large audit can't blow up
  the prompt.
- `generate_summary(result, client=...)` takes an injectable client so the
  unit tests never need real credentials or network access. It only builds
  a real `genai.Client` when no client is passed in.
- Importing this module does **not** require an API key — only calling
  `generate_summary()` (or `build_client()`/`get_api_key()` directly) does.
  That's what makes `build_prompt` cheaply testable on its own.
- `GEMINI_MODEL` env var overrides the default model if Google deprecates
  the current default again (this already happened once during setup —
  `gemini-2.5-flash` returned 404 "no longer available to new users").
