# llm-qa-toolkit

A small Python toolkit that uses LLMs at specific points in a QA pipeline: draft test cases from requirement markdown, triage application logs, and scaffold Playwright-BDD tests — with a **mandatory human-review gate** before any AI output becomes an executable test. Token and cost usage are tracked per call (from the provider's own usage block where available, a labeled estimate otherwise).

> **A note on "agents."** These are deliberate, single-shot LLM calls at fixed points in a pipeline, not autonomous agents — there is no planning, tool use, or adaptive loop. The engineering that matters here is the discipline around the calls: provider abstraction, retry handling, cost tracking, and a human reviewing every output before it reaches a test. That framing is intentional.

## Example outputs (what you get)

The examples below are actual output from GPT-4o-mini on the bundled sample files. Your results will look similar but not identical — different models produce different wording.

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
cd llm-qa-toolkit
uv sync
cp .env.example .env
# Edit .env: set PROVIDER (openai | google | ollama) and the matching API key / Ollama host.
```

Without `uv`, you can use a venv and `pip install -e .` from the same directory.

### Running tests

```bash
uv sync --group dev
uv run pytest
```

## Configuration

| Variable | Purpose |
|----------|---------|
| `PROVIDER` | `openai`, `google`, or `ollama` |
| `MODEL` | Model id for that provider |
| `OPENAI_API_KEY` | If using OpenAI |
| `GOOGLE_API_KEY` | If using Google Gemini |
| `OLLAMA_HOST` | If using Ollama (e.g. `http://localhost:11434`) |
| `OLLAMA_READ_TIMEOUT` | Long read timeout for local models (seconds) |
| `LLM_MAX_ATTEMPTS` | Retry attempts for transient network errors / 429 / 5xx (default `3`) |

Token counts and cost come from the provider's own `usage` block when the API returns
one (OpenAI, Gemini, and Ollama all do); if a response has no usage data, the summary
falls back to a rough character-based estimate and labels it accordingly
(`Total Tokens: N (api)` vs `(estimated)`).

## Try it in ~5 minutes

With `.env` configured (any provider you have: **Ollama** is enough), run the log analyzer on the **bundled anonymized sample** (no need to add your own logs first):

```bash
python -m src.agents.log_analyzer data/logs/sample_ecommerce.log
# Or, if that is the only .log in data/logs/:
# python -m src.agents.log_analyzer
```

Test-case generation on sample requirements:

```bash
python -m src.agents.testcase_generator data/requirements/payment_checkout.md
```

## Python Agents + Playwright BDD Integration

This project combines two automation pipelines:

### 🤖 Python Agents (AI-Driven)
- **Test Case Generation:** Converts requirements into structured test cases (CSV)
- **Log Analysis:** Analyzes logs and generates insights with actionable recommendations

**Outputs:** All artifacts go to `output/` (gitignored)

### 🎭 Playwright BDD (Execution)
- Located in `playwright-project/`
- Executes automated tests against web applications
- Uses generated test cases as reference for BDD scenarios

### 🔗 Integration Workflow
**⚠️ Manual Review Required:** Python agents generate test case _metadata_. A QA Engineer must:

1. Review AI-generated test cases in `output/testcase_generated/*.csv`
2. Map each CSV row to a BDD scenario in `playwright-project/features/*.feature`
3. Implement step definitions in `playwright-project/steps/`
4. Keep CSV and .feature files in sync via @TC-XXX tags

**For details, see [INTEGRATION_GUIDE.md](INTEGRATION_GUIDE.md)** ← Start here for full workflow.

### Quick Playwright Setup & Run

```bash
cd playwright-project
npm install

# Run tests (requires .env with PW_BASE_URL, PW_TEST_EMAIL, PW_TEST_PASSWORD)
npm run test          # All tests
npm run test:smoke    # Smoke tests only
npm run test:regression  # Regression suite

# View results
npm run allure:generate
npm run allure:open
```

### 📊 Published Test Reports

Every push to `main` publishes the latest Playwright and Allure reports to GitHub Pages — no need to download and unzip CI artifacts:

- **[Reports index](https://bireshpatel.github.io/llm-qa-toolkit/)**
- **[Playwright HTML Report](https://bireshpatel.github.io/llm-qa-toolkit/playwright-report/)** — pass/fail results, screenshots, videos, traces
- **[Allure Report](https://bireshpatel.github.io/llm-qa-toolkit/allure-report/)** — suite breakdown and history

Reports are also published for manual `workflow_dispatch` runs. See [.github/workflows/playwright.yml](.github/workflows/playwright.yml).

---

From the project root:

```bash
# All requirement .md files in data/requirements/
python -m src.agents.testcase_generator

# Single file
python -m src.agents.testcase_generator data/requirements/payment_checkout.md
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
- `output/` — generated on each run (gitignored). The log analyzer writes three files per run: a full technical report (`_analysis.txt`), a structured JSON summary (`_analysis.json`) for tools or pipelines, and a short plain-English paragraph (`_executive.txt`) written for anyone who doesn't read logs.

## Contributing

Issues and ideas: use **New issue** on GitHub; this repo includes [bug report and feature request templates](.github/ISSUE_TEMPLATE/).

## License

This project is licensed under the [MIT License](LICENSE). You may use, copy, modify, and distribute the code, including in commercial projects, as long as you keep the license and copyright notice. There is no warranty; use at your own risk.
