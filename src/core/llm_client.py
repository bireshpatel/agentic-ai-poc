# Simple LLM client interface for interacting with language models. - Ollama, OpenAI, Google

import os
import time
from typing import List, Dict, Optional, Tuple, Union
import httpx
from dotenv import load_dotenv
from tenacity import (
    retry,
    retry_if_exception,
    stop_after_attempt,
    wait_exponential,
)
from .cost_tracker import calculate_cost


load_dotenv()

PROVIDER = os.getenv("PROVIDER", "openai")
MODEL = os.getenv("MODEL", "gpt-4o-mini")
OPENAI_API_KEY = os.getenv("OPENAI_API_KEY", "")
GOOGLE_API_KEY = os.getenv("GOOGLE_API_KEY", "")
# Ollama’s default API port is 11434, not 8080
OLLAMA_HOST = os.getenv("OLLAMA_HOST", "http://127.0.0.1:11434")
TIMEOUT = int(os.getenv("TIMEOUT", 60))
# Local Ollama can spend minutes on first load or long generations; 60s often hits httpx.ReadTimeout
OLLAMA_READ_TIMEOUT = float(os.getenv("OLLAMA_READ_TIMEOUT", "600"))
# OpenAI / Google: codegen and large completions often exceed TIMEOUT (default 60s) → httpx.ReadTimeout
LLM_READ_TIMEOUT = float(os.getenv("LLM_READ_TIMEOUT", "300"))
# Retries: transient network errors and 429/5xx responses only — never 4xx client errors
# (bad API key, bad request), which will never succeed on retry.
LLM_MAX_ATTEMPTS = int(os.getenv("LLM_MAX_ATTEMPTS", "3"))
RETRYABLE_STATUS_CODES = {429, 500, 502, 503, 504}


def _is_retryable(exc: BaseException) -> bool:
    if isinstance(exc, httpx.HTTPStatusError):
        return exc.response.status_code in RETRYABLE_STATUS_CODES
    return isinstance(exc, (httpx.TimeoutException, httpx.ConnectError, httpx.ReadError))


def _cloud_http_timeout() -> httpx.Timeout:
    """Separate read budget for cloud APIs (connect/write stay bounded)."""
    return httpx.Timeout(
        connect=30.0,
        read=LLM_READ_TIMEOUT,
        write=120.0,
        pool=5.0,
    )

Message = Dict[str, str]

def _check_provider_config(provider: str) -> None:
    p = (provider or "").lower().strip()
    if p == "openai" and not OPENAI_API_KEY:
        raise ValueError(
            "PROVIDER=openai but OPENAI_API_KEY is not set. Add it to .env or set "
            "PROVIDER=ollama for a local model."
        )
    if p == "google" and not GOOGLE_API_KEY:
        raise ValueError(
            "PROVIDER=google but GOOGLE_API_KEY is not set. Get a key at "
            "https://aistudio.google.com/apikey, add GOOGLE_API_KEY=... to .env, or set "
            "PROVIDER=ollama (or openai with OPENAI_API_KEY)."
        )


def chat(messages: List[Message]) -> Dict:
    if not messages:
        raise ValueError("Messages list cannot be empty.")
    p = (PROVIDER or "openai").lower().strip()
    _check_provider_config(p)
    start_time = time.time()

    if p == "openai":
        response, usage = _call_openai(messages)
    elif p == "google":
        response, usage = _call_gemini(messages)
    elif p == "ollama":
        response, usage = _call_ollama(messages)
    else:
        raise NotImplementedError(f"Provider {PROVIDER!r} is not implemented.")

    duration_ms = int((time.time() - start_time) * 1000)
    print(f"LLM call duration: {duration_ms} ms")

    if usage is not None:
        prompt_tokens, response_tokens = usage
        token_source = "api"
    else:
        # Provider response had no usage block — fall back to a rough estimate
        # (1 token ≈ 4 characters).
        prompt_text = " ".join([m["content"] for m in messages])
        prompt_tokens = len(prompt_text) // 4
        response_tokens = len(response) // 4
        token_source = "estimated"

    # Calculate Cost
    cost = calculate_cost(p, MODEL, prompt_tokens, response_tokens)

    return {
        "response": response,
        "metadata": {
            "provider": p,
            "model": MODEL,
            "prompt_tokens": prompt_tokens,
            "response_tokens": response_tokens,
            "total_tokens": prompt_tokens + response_tokens,
            "token_source": token_source,
            "duration_ms": duration_ms,
            "cost_usd": cost
        }
    }

@retry(
    retry=retry_if_exception(_is_retryable),
    stop=stop_after_attempt(LLM_MAX_ATTEMPTS),
    wait=wait_exponential(multiplier=1, min=2, max=20),
    reraise=True,
)
def _http_post(
    url: str,
    headers: Dict,
    payload: Dict,
    timeout: Optional[Union[int, float, httpx.Timeout]] = None,
) -> Dict:
    t: Union[int, float, httpx.Timeout] = (
        timeout if timeout is not None else TIMEOUT
    )
    with httpx.Client(timeout=t) as client:
        response = client.post(url, json=payload, headers=headers)
        response.raise_for_status()
        return response.json()

# Usage tuple returned by each provider call: (prompt_tokens, response_tokens),
# or None when the provider response has no usage block (fall back to estimate).
Usage = Optional[Tuple[int, int]]


def _call_openai(messages: List[Message]) -> Tuple[str, Usage]:
    if not OPENAI_API_KEY:
        raise ValueError("OpenAI API key is required.")
    url = "https://api.openai.com/v1/chat/completions"
    headers = {
        "Authorization": f"Bearer {OPENAI_API_KEY}",
        "Content-Type": "application/json"
    }
    payload = {
        "model": MODEL,
        "messages": messages,
        "temperature": 0,
    }
    data = _http_post(url, headers, payload, timeout=_cloud_http_timeout())
    text = data["choices"][0]["message"]["content"]
    usage = data.get("usage") or {}
    if "prompt_tokens" in usage and "completion_tokens" in usage:
        return text, (int(usage["prompt_tokens"]), int(usage["completion_tokens"]))
    return text, None

def _call_gemini(messages: List[Message]) -> Tuple[str, Usage]:
    if not GOOGLE_API_KEY:
        raise ValueError(
            "Google API key is missing. Set GOOGLE_API_KEY in .env."
        )
    url = f"https://generativelanguage.googleapis.com/v1beta/models/{MODEL}:generateContent"
    headers = {
        "x-goog-api-key": GOOGLE_API_KEY,
        "Content-Type": "application/json"
    }
    contents = []
    system_text = ""

    for msg in messages:
        if msg["role"] == "system":
            system_text = msg["content"]
        elif msg["role"] == "user":
            if system_text:
                combined = f"{system_text}\n\n{msg['content']}"
                contents.append({
                    "role": "user",
                    "parts": [{"text": combined}]
                })
                system_text = ""
            else:
                contents.append({
                    "role": "user",
                    "parts": [{"text": msg["content"]}]
                })
        elif msg["role"] == "assistant":
            contents.append({
                "role": "model",
                "parts": [{"text": msg["content"]}]
            })


    payload = {
        "contents": contents,
        "generationConfig": {"temperature":  0  }
    }

    data = _http_post(url, headers, payload, timeout=_cloud_http_timeout())
    text = data["candidates"][0]["content"]["parts"][0]["text"]
    usage = data.get("usageMetadata") or {}
    if "promptTokenCount" in usage and "candidatesTokenCount" in usage:
        return text, (int(usage["promptTokenCount"]), int(usage["candidatesTokenCount"]))
    return text, None

def _call_ollama(messages: List[Message]) -> Tuple[str, Usage]:
    url = f"{OLLAMA_HOST.rstrip('/')}/api/chat"
    headers = {
        "Content-Type": "application/json"
    }
    payload = {
        "model": MODEL,
        "messages": messages,
        "stream": False
    }
    ollama_httpx_timeout = httpx.Timeout(
        connect=30.0, read=OLLAMA_READ_TIMEOUT, write=60.0, pool=5.0
    )
    data = _http_post(url, headers, payload, timeout=ollama_httpx_timeout)

    msg = data.get("message") or {}
    if not msg or "content" not in msg:
        raise ValueError("Ollama returned empty response. Is Ollama running and the model pulled?")
    text = msg["content"]
    if "prompt_eval_count" in data and "eval_count" in data:
        return text, (int(data["prompt_eval_count"]), int(data["eval_count"]))
    return text, None