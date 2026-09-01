from unittest.mock import MagicMock

import pytest

from llm.summary import (
    MAX_FINDINGS_IN_PROMPT,
    MissingApiKeyError,
    build_prompt,
    generate_summary,
    get_api_key,
)

CLEAN_RESULT = {
    "url": "https://example.com",
    "auditedAt": "2026-01-01T00:00:00.000Z",
    "summary": {"error": 0, "warning": 0, "info": 0, "total": 0},
    "findings": [],
}


def make_finding(severity, message="issue", category="metadata", **extra):
    return {"category": category, "rule": "some-rule", "severity": severity, "message": message, **extra}


class TestBuildPrompt:
    def test_clean_audit_produces_a_short_all_clear_prompt(self):
        prompt = build_prompt(CLEAN_RESULT)
        assert "https://example.com" in prompt
        assert "no issues" in prompt

    def test_includes_each_findings_message_and_severity(self):
        result = {
            **CLEAN_RESULT,
            "findings": [
                make_finding("error", "HTTP 500 Internal Server Error"),
                make_finding("warning", "Missing meta description"),
            ],
        }
        prompt = build_prompt(result)
        assert "HTTP 500 Internal Server Error" in prompt
        assert "Missing meta description" in prompt
        assert "[error]" in prompt
        assert "[warning]" in prompt

    def test_errors_are_ordered_before_warnings_and_info(self):
        result = {
            **CLEAN_RESULT,
            "findings": [
                make_finding("info", "an info item"),
                make_finding("warning", "a warning item"),
                make_finding("error", "an error item"),
            ],
        }
        prompt = build_prompt(result)
        assert prompt.index("an error item") < prompt.index("a warning item")
        assert prompt.index("a warning item") < prompt.index("an info item")

    def test_caps_the_number_of_findings_and_notes_how_many_were_omitted(self):
        findings = [make_finding("warning", f"issue {i}") for i in range(MAX_FINDINGS_IN_PROMPT + 5)]
        result = {**CLEAN_RESULT, "findings": findings}
        prompt = build_prompt(result)

        assert "issue 0" in prompt
        assert f"issue {MAX_FINDINGS_IN_PROMPT - 1}" in prompt
        assert f"issue {MAX_FINDINGS_IN_PROMPT}" not in prompt
        assert "5 more finding(s) not shown" in prompt

    def test_asks_for_a_plain_english_ranked_summary(self):
        result = {**CLEAN_RESULT, "findings": [make_finding("error")]}
        prompt = build_prompt(result)
        assert "plain English" in prompt
        assert "200 words" in prompt


class TestGetApiKey:
    def test_returns_the_configured_key(self, monkeypatch):
        monkeypatch.setenv("GEMINI_API_KEY", "test-key-123")
        assert get_api_key() == "test-key-123"

    def test_raises_when_unset(self, monkeypatch):
        monkeypatch.delenv("GEMINI_API_KEY", raising=False)
        with pytest.raises(MissingApiKeyError):
            get_api_key()


class TestGenerateSummary:
    def test_returns_the_model_response_text(self):
        fake_client = MagicMock()
        fake_client.models.generate_content.return_value = MagicMock(text="Fix the broken link first.")

        summary = generate_summary(
            {**CLEAN_RESULT, "findings": [make_finding("error")]}, client=fake_client
        )

        assert summary == "Fix the broken link first."
        fake_client.models.generate_content.assert_called_once()

    def test_passes_the_built_prompt_to_the_model(self):
        fake_client = MagicMock()
        fake_client.models.generate_content.return_value = MagicMock(text="ok")
        result = {**CLEAN_RESULT, "findings": [make_finding("error", "a distinctive message")]}

        generate_summary(result, client=fake_client)

        _, kwargs = fake_client.models.generate_content.call_args
        assert "a distinctive message" in kwargs["contents"]

    def test_returns_a_readable_message_when_the_client_raises(self):
        fake_client = MagicMock()
        fake_client.models.generate_content.side_effect = RuntimeError("rate limited")

        summary = generate_summary(CLEAN_RESULT, client=fake_client)

        assert "unavailable" in summary
        assert "rate limited" in summary

    def test_returns_a_readable_message_when_no_api_key_is_configured(self, monkeypatch):
        monkeypatch.delenv("GEMINI_API_KEY", raising=False)

        summary = generate_summary(CLEAN_RESULT)  # no client injected -> tries to build one

        assert "unavailable" in summary
        assert "GEMINI_API_KEY" in summary
