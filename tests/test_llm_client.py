import time

import httpx
import pytest

from src.core import llm_client


# ---- retry behavior of _http_post ------------------------------------------

class _FakeResponse:
    def __init__(self, status_code=200, payload=None):
        self.status_code = status_code
        self._payload = payload or {}

    def raise_for_status(self):
        if self.status_code >= 400:
            raise httpx.HTTPStatusError(
                f"status {self.status_code}",
                request=httpx.Request("POST", "http://example.test"),
                response=self,
            )

    def json(self):
        return self._payload


class _FakeClient:
    """Stand-in for httpx.Client whose .post() is driven by a callback."""

    def __init__(self, on_post):
        self._on_post = on_post

    def __call__(self, timeout=None):
        return self

    def __enter__(self):
        return self

    def __exit__(self, *exc):
        return False

    def post(self, url, json=None, headers=None):
        return self._on_post()


@pytest.fixture(autouse=True)
def _no_real_sleep(monkeypatch):
    # Tenacity's wait_exponential would otherwise slow the suite down for real.
    monkeypatch.setattr(time, "sleep", lambda seconds: None)


def test_http_post_retries_on_timeout_then_succeeds(monkeypatch):
    calls = {"n": 0}

    def on_post():
        calls["n"] += 1
        if calls["n"] < 3:
            raise httpx.ConnectTimeout(
                "boom", request=httpx.Request("POST", "http://example.test")
            )
        return _FakeResponse(200, {"ok": True})

    monkeypatch.setattr(httpx, "Client", _FakeClient(on_post))
    result = llm_client._http_post("http://example.test", {}, {})

    assert result == {"ok": True}
    assert calls["n"] == 3


def test_http_post_retries_on_retryable_status_code(monkeypatch):
    calls = {"n": 0}

    def on_post():
        calls["n"] += 1
        status = 503 if calls["n"] < 2 else 200
        return _FakeResponse(status, {"ok": True})

    monkeypatch.setattr(httpx, "Client", _FakeClient(on_post))
    result = llm_client._http_post("http://example.test", {}, {})

    assert result == {"ok": True}
    assert calls["n"] == 2


def test_http_post_does_not_retry_on_client_error(monkeypatch):
    calls = {"n": 0}

    def on_post():
        calls["n"] += 1
        return _FakeResponse(401, {})

    monkeypatch.setattr(httpx, "Client", _FakeClient(on_post))
    with pytest.raises(httpx.HTTPStatusError):
        llm_client._http_post("http://example.test", {}, {})

    assert calls["n"] == 1


def test_http_post_gives_up_after_max_attempts(monkeypatch):
    calls = {"n": 0}

    def on_post():
        calls["n"] += 1
        raise httpx.ConnectTimeout(
            "boom", request=httpx.Request("POST", "http://example.test")
        )

    monkeypatch.setattr(httpx, "Client", _FakeClient(on_post))
    with pytest.raises(httpx.ConnectTimeout):
        llm_client._http_post("http://example.test", {}, {})

    assert calls["n"] == llm_client.LLM_MAX_ATTEMPTS


@pytest.mark.parametrize(
    "exc, expected",
    [
        (ValueError("not http"), False),
        (httpx.ConnectError("x", request=httpx.Request("POST", "http://x")), True),
    ],
)
def test_is_retryable_predicate(exc, expected):
    assert llm_client._is_retryable(exc) is expected


# ---- usage-based token extraction ------------------------------------------

def test_call_openai_uses_real_usage_when_present(monkeypatch):
    monkeypatch.setattr(llm_client, "OPENAI_API_KEY", "test-key")
    monkeypatch.setattr(
        llm_client,
        "_http_post",
        lambda *a, **k: {
            "choices": [{"message": {"content": "hello"}}],
            "usage": {"prompt_tokens": 42, "completion_tokens": 7},
        },
    )
    text, usage = llm_client._call_openai([{"role": "user", "content": "hi"}])
    assert text == "hello"
    assert usage == (42, 7)


def test_call_openai_returns_none_usage_when_missing(monkeypatch):
    monkeypatch.setattr(llm_client, "OPENAI_API_KEY", "test-key")
    monkeypatch.setattr(
        llm_client,
        "_http_post",
        lambda *a, **k: {"choices": [{"message": {"content": "hello"}}]},
    )
    _, usage = llm_client._call_openai([{"role": "user", "content": "hi"}])
    assert usage is None


def test_call_gemini_uses_real_usage_when_present(monkeypatch):
    monkeypatch.setattr(llm_client, "GOOGLE_API_KEY", "test-key")
    monkeypatch.setattr(
        llm_client,
        "_http_post",
        lambda *a, **k: {
            "candidates": [{"content": {"parts": [{"text": "hi"}]}}],
            "usageMetadata": {"promptTokenCount": 10, "candidatesTokenCount": 5},
        },
    )
    text, usage = llm_client._call_gemini([{"role": "user", "content": "hi"}])
    assert text == "hi"
    assert usage == (10, 5)


def test_call_ollama_uses_real_usage_when_present(monkeypatch):
    monkeypatch.setattr(
        llm_client,
        "_http_post",
        lambda *a, **k: {
            "message": {"content": "hi"},
            "prompt_eval_count": 12,
            "eval_count": 3,
        },
    )
    text, usage = llm_client._call_ollama([{"role": "user", "content": "hi"}])
    assert text == "hi"
    assert usage == (12, 3)


def test_call_ollama_returns_none_usage_when_missing(monkeypatch):
    monkeypatch.setattr(
        llm_client,
        "_http_post",
        lambda *a, **k: {"message": {"content": "hi"}},
    )
    _, usage = llm_client._call_ollama([{"role": "user", "content": "hi"}])
    assert usage is None


def test_call_ollama_raises_on_empty_response(monkeypatch):
    monkeypatch.setattr(llm_client, "_http_post", lambda *a, **k: {"message": {}})
    with pytest.raises(ValueError):
        llm_client._call_ollama([{"role": "user", "content": "hi"}])


# ---- chat() orchestration ---------------------------------------------------

def test_chat_uses_api_usage_and_computes_cost(monkeypatch):
    monkeypatch.setattr(llm_client, "PROVIDER", "openai")
    monkeypatch.setattr(llm_client, "MODEL", "gpt-4o-mini")
    monkeypatch.setattr(llm_client, "OPENAI_API_KEY", "test-key")
    monkeypatch.setattr(
        llm_client, "_call_openai", lambda messages: ("hi there", (1000, 1000))
    )

    result = llm_client.chat([{"role": "user", "content": "hello"}])

    assert result["metadata"]["token_source"] == "api"
    assert result["metadata"]["total_tokens"] == 2000
    assert result["metadata"]["cost_usd"] == pytest.approx(0.00015 + 0.0006)


def test_chat_falls_back_to_estimated_tokens(monkeypatch):
    monkeypatch.setattr(llm_client, "PROVIDER", "openai")
    monkeypatch.setattr(llm_client, "OPENAI_API_KEY", "test-key")
    monkeypatch.setattr(llm_client, "_call_openai", lambda messages: ("hi", None))

    result = llm_client.chat([{"role": "user", "content": "hello world"}])

    assert result["metadata"]["token_source"] == "estimated"


def test_chat_raises_without_messages():
    with pytest.raises(ValueError):
        llm_client.chat([])


def test_chat_raises_when_provider_missing_api_key(monkeypatch):
    monkeypatch.setattr(llm_client, "PROVIDER", "openai")
    monkeypatch.setattr(llm_client, "OPENAI_API_KEY", "")
    with pytest.raises(ValueError):
        llm_client.chat([{"role": "user", "content": "hi"}])
