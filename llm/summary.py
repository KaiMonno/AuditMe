"""
llm/summary.py

AuditMe's LLM-powered summary feature: take a structured audit result (the
same shape lib/runner.js and reports/result.js produce on the Node side)
and ask Gemini for a short, prioritized, plain-English summary of what to
fix first.

Standalone for now — not called from audit.js or server/ yet. Once the
product decides how a Python step fits into the Node pipeline (subprocess?
reimplemented as a JS call to the Gemini REST API?), that's a real
architecture decision to make deliberately, not something to wire in
silently.

Setup:
    pip install -r llm/requirements.txt
    cp llm/.env.example llm/.env
    # put your real key in llm/.env — that file is gitignored, never commit it
"""

from __future__ import annotations

import os
from typing import Optional, TypedDict

from dotenv import load_dotenv
from google import genai

load_dotenv()  # reads llm/.env if present; real env vars still take priority

DEFAULT_MODEL = "gemini-3.6-flash"  # fast and friendly to the free tier
MODEL_NAME = os.environ.get("GEMINI_MODEL", DEFAULT_MODEL)

MAX_FINDINGS_IN_PROMPT = 20  # cap so the prompt doesn't explode on a large audit


# --- Types -------------------------------------------------------------------
# Mirrors checks/types.js's Finding typedef and reports/result.js's result
# shape on the Node side. Keep these in sync if that contract changes.


class Finding(TypedDict, total=False):
    category: str  # 'functional' | 'metadata' | 'accessibility'
    rule: str
    severity: str  # 'error' | 'warning' | 'info'
    message: str
    url: str  # optional


class Summary(TypedDict):
    error: int
    warning: int
    info: int
    total: int


class AuditResult(TypedDict):
    url: str
    auditedAt: str
    summary: Summary
    findings: list[Finding]


class MissingApiKeyError(RuntimeError):
    """Raised when no Gemini API key is configured."""


# --- API key / client setup ---------------------------------------------------
def get_api_key() -> str:
    """
    Read the Gemini API key from the environment (including llm/.env via
    python-dotenv). Raises rather than silently falling back to a
    placeholder, so a misconfigured environment fails loudly instead of
    quietly sending garbage requests.
    """
    api_key = os.environ.get("GEMINI_API_KEY")
    if not api_key:
        raise MissingApiKeyError(
            "GEMINI_API_KEY is not set. Copy llm/.env.example to llm/.env "
            "and fill in a real key, or export GEMINI_API_KEY yourself. "
            "Never commit a real key to git."
        )
    return api_key


def build_client() -> genai.Client:
    """Construct a Gemini client. Only called when a summary is actually
    requested — importing this module does not require an API key."""
    return genai.Client(api_key=get_api_key())


# --- Prompt construction -------------------------------------------------------
def build_prompt(result: AuditResult) -> str:
    """
    Turn an AuditMe audit result into a plain-language prompt.

    `result` is the same object shape reports/result.js's buildResult()
    produces: {url, auditedAt, summary, findings}, where each finding is
    {category, rule, severity, message, url?}.
    """
    findings = result.get("findings", [])

    if not findings:
        return (
            f"A website audit of {result.get('url', 'the site')} found no issues. "
            "Write one short sentence confirming the site is clean."
        )

    # Errors first — those are what a non-technical owner most needs to hear
    # about. Ties broken by original (check-module) order.
    severity_rank = {"error": 0, "warning": 1, "info": 2}
    ordered = sorted(findings, key=lambda f: severity_rank.get(f.get("severity"), 3))

    lines = [f"Here are the results of a website audit of {result.get('url', 'the site')}:\n"]
    for finding in ordered[:MAX_FINDINGS_IN_PROMPT]:
        category = finding.get("category", "general")
        severity = finding.get("severity", "info")
        message = finding.get("message", "")
        lines.append(f"  - [{severity}] ({category}) {message}")

    omitted = len(findings) - min(len(findings), MAX_FINDINGS_IN_PROMPT)
    if omitted > 0:
        lines.append(f"  ...and {omitted} more finding(s) not shown.")

    lines.append("")
    lines.append(
        "Summarize the most important issues in plain English for a "
        "non-technical site owner, and rank them by likely impact on "
        "user experience and SEO. Keep it under 200 words."
    )

    return "\n".join(lines)


# --- The actual API call -------------------------------------------------------
def generate_summary(result: AuditResult, client: Optional[genai.Client] = None) -> str:
    """
    Send the audit result to Gemini and return a prioritized plain-English
    summary. Returns an error message string instead of raising, so a
    flaky API call doesn't crash the whole audit run.

    `client` is injectable so tests can pass a fake without needing real
    credentials; defaults to a freshly-built client using GEMINI_API_KEY.
    """
    prompt = build_prompt(result)

    try:
        active_client = client or build_client()
        response = active_client.models.generate_content(
            model=MODEL_NAME,
            contents=prompt,
        )
        return response.text
    except MissingApiKeyError as e:
        return f"(LLM summary unavailable: {e})"
    except Exception as e:
        # A real version would distinguish rate-limit vs. auth vs. network
        # errors, but this is enough to keep the audit tool usable even if
        # the API call fails.
        return f"(LLM summary unavailable: {type(e).__name__}: {e})"


# --- Quick manual test ---------------------------------------------------------
if __name__ == "__main__":
    dummy_result: AuditResult = {
        "url": "https://example.com",
        "auditedAt": "2026-01-01T00:00:00.000Z",
        "summary": {"error": 1, "warning": 3, "info": 0, "total": 4},
        "findings": [
            {
                "category": "functional",
                "rule": "http-error-response",
                "severity": "error",
                "message": "HTTP 500 Internal Server Error",
                "url": "https://example.com/old-promo",
            },
            {
                "category": "metadata",
                "rule": "missing-img-alt",
                "severity": "error",
                "message": "Image is missing an alt attribute (hero.png)",
                "url": "https://example.com/images/hero.png",
            },
            {
                "category": "metadata",
                "rule": "missing-meta-description",
                "severity": "warning",
                "message": 'Missing <meta name="description">',
                "url": "https://example.com/about",
            },
            {
                "category": "metadata",
                "rule": "missing-canonical",
                "severity": "warning",
                "message": 'Missing <link rel="canonical">',
                "url": "https://example.com/contact",
            },
        ],
    }

    print("Prompt sent to the model:\n")
    print(build_prompt(dummy_result))
    print("\n---\n")
    print("Model's summary:\n")
    print(generate_summary(dummy_result))
