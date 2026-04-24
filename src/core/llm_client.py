# Simple LLM client interface for interacting with language models. - Ollama, OpenAI, Google

import os
import time
from typing import List, Dict, Optional, Union
import httpx
from dotenv import load_dotenv
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
        response = _call_openai(messages)
    elif p == "google":
        response = _call_gemini(messages)  # Placeholder for Google implementation
    elif p == "ollama":
        response = _call_ollama(messages)
    else:
        raise NotImplementedError(f"Provider {PROVIDER!r} is not implemented.")

    duration_ms = int((time.time() - start_time) * 1000)
    print(f"LLM call duration: {duration_ms} ms")

    # Estimate tokens (rough: 1 token ≈ 4 characters)
    prompt_text = " ".join([m["content"] for m in messages])
    prompt_tokens = len(prompt_text) // 4
    response_tokens = len(response) // 4

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
            "duration_ms": duration_ms,
            "cost_usd": cost
        }
    }

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

def _call_openai(messages: List[Message]) -> str:
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
    data = _http_post(url, headers, payload)
    return data["choices"][0]["message"]["content"]

def _call_gemini(messages: List[Message]) -> str:
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

    data = _http_post(url, headers, payload)
    return data["candidates"][0]["content"]["parts"][0]["text"]

def _call_ollama(messages: List[Message]) -> str:
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
    return msg["content"]