# agentic-ai-poc

Small Python PoC for **LLM-backed agents**: generate test cases from requirement markdown, analyze logs, and track rough token/cost estimates (where supported).

## Example outputs (what you get)

Wording varies by **model and run**; the **shape** below matches what the agents are built to produce.

### Requirements → test cases

**Input (excerpt from a requirement like `data/requirements/payment_checkout.md`):**

```text
US-PC-01: As a logged-in customer, I want to complete the payment checkout flow
so that I can place a successful order.

  AC: Given I am on the payment page
      When I submit valid card details and confirm
      Then I see "Your order has been placed successfully!"
```

**Example model output (JSON; also written to `output/testcase_generated/<name>_raw_output.json`):**

```json
[
  {
    "id": "TC-001",
    "title": "Successful order placement with valid card",
    "steps": [
      "Log in, add a product, open cart, proceed to checkout",
      "On payment page enter valid card, CVC, expiry, click pay",
      "Assert success message and order confirmation screen"
    ],
    "expected": "Order is placed and confirmation message is shown",
    "priority": "High"
  }
]
```

A **CSV** with columns `TestID`, `Title`, `Steps`, `Expected`, `Priority` is written alongside the JSON.

### Log file → analysis

**Input (excerpt from `data/logs/sample_ecommerce.log`):**

```text
[ERROR] service=payment-svc op=auth_capture event=TIMEOUT
message="PSP connection exceeded 3s" … trace=pay-44b7d2a
stack: payment.capture -> httpx.ReadTimeout
```

**Example model output (technical report → `..._analysis.txt`); abridged:**

```text
Summary: Payment service saw a third-party (PSP) timeout on the first auth capture
attempt; the request succeeded on retry. A separate error shows Elasticsearch
unavailable and search running in a degraded (fallback) mode.

Critical / notable events:
- payment-svc: TIMEOUT on first PSP call (httpx.ReadTimeout) — mitigated by retry
- search-svc: "all shards failed" / connection refused to index cluster

Recommendations: increase PSP connect/read budgets or circuit-break; restore ES cluster
or extend fallback monitoring for catalog search.
```

**Structured summary (from the model’s JSON block in the reply → `..._analysis.json`); example shape:**

```json
{
  "summary": "PSP timeout on first capture (recovered on retry); search tier degraded (ES down)",
  "error_count": 4,
  "severity": "high"
}
```

**Plain-language executive blurb (→ `..._executive.txt`):** a short, non-technical paragraph after `---EXECUTIVE---` in the model output (e.g. impact to customers, what to fix first).

## Setup

Requires **Python 3.9+**. This repo uses **[uv](https://github.com/astral-sh/uv)** for dependencies.

```bash
cd agentic-ai-poc
uv sync
cp .env.example .env
# Edit .env: set PROVIDER (openai | google | ollama) and the matching API key / Ollama host.
```

Without `uv`, you can use a venv and `pip install -e .` from the same directory.

## Configuration

| Variable | Purpose |
|----------|---------|
| `PROVIDER` | `openai`, `google`, or `ollama` |
| `MODEL` | Model id for that provider |
| `OPENAI_API_KEY` | If using OpenAI |
| `GOOGLE_API_KEY` | If using Google Gemini |
| `OLLAMA_HOST` | If using Ollama (e.g. `http://localhost:11434`) |
| `OLLAMA_READ_TIMEOUT` | Long read timeout for local models (seconds) |

## Try it in ~5 minutes

With `.env` configured (any provider you have: **Ollama** is enough), run the log analyzer on the **bundled anonymized sample** (no need to add your own logs first):

```bash
python -m src.agents.log_analyzer data/logs/sample_ecommerce.log
# Or, if that is the only .log in data/logs/:
# python -m src.agents.log_analyzer
```

Test-case generation on sample requirements:

```bash
python -m src.agents.testcase_agent data/requirements/payment_checkout.md
```

## Usage

From the project root:

```bash
# All requirement .md files in data/requirements/
python -m src.agents.testcase_agent

# Single file
python -m src.agents.testcase_agent data/requirements/payment_checkout.md
```

```bash
python -m src.agents.log_analyzer data/logs/your.log
# Custom logs under data/logs/ are gitignored except bundled sample_*.log files.
```

Generated artifacts go under `output/` (gitignored). The **sample** log is tracked: `data/logs/sample_ecommerce.log` (synthetic, anonymized).

## Layout

- `data/requirements/` — example requirement documents (tracked).
- `data/logs/` — includes a **demo** `sample_*.log` (tracked). Your own `*.log` files stay local (gitignored).
- `src/core/` — LLM client, utilities, logging, cost helper.
- `src/agents/` — CLI entrypoints for test-case and log analysis agents.

## Contributing

Issues and ideas: use **New issue** on GitHub; this repo includes [bug report and feature request templates](.github/ISSUE_TEMPLATE/).

## License

This project is licensed under the [MIT License](LICENSE). You may use, copy, modify, and distribute the code, including in commercial projects, as long as you keep the license and copyright notice. There is no warranty; use at your own risk.
