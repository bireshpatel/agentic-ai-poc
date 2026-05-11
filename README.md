# agentic-ai-poc

Small Python PoC for **LLM-backed agents**: generate test cases from requirement markdown, analyze logs, and track rough token/cost estimates (where supported).

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
| `PW_BASE_URL` | Base URL for Playwright `use.baseURL` (also read by `playwright-project/` via root `.env`; see below) |

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

## Framework template: requirements → runnable Playwright BDD

Use this repo as a **repeatable pipeline**: requirement markdown → JSON test cases → **Gherkin + step definitions + Page Object** under `playwright-project/`, executed by **Playwright** with **playwright-bdd** (Cucumber-compatible).

### Naming one suite (`stem`)

Use the **same basename** everywhere (lowercase `snake_case` recommended):

| Artifact | Path |
|----------|------|
| Requirements | `data/requirements/<stem>.md` |
| Generated test cases (from LLM) | `output/testcase_generated/<stem>_raw_output.json` |
| Page metadata & selectors | `data/page_context/<stem>_page.json` |
| Generated BDD + TS | `playwright-project/features/<stem>.feature`, `steps/<stem>.steps.ts`, `pages/<PageName>Page.ts` |

The generator picks up page context automatically when `data/page_context/<stem>_page.json` exists. Override with `--page-context path/to.json`.

### New suite from templates

```bash
bash scripts/bootstrap_bdd_suite.sh my_feature
# Edit data/requirements/my_feature.md and data/page_context/my_feature_page.json
```

Starters (copy manually if you prefer):

- [data/requirements/requirements.template.md](data/requirements/requirements.template.md)
- [data/page_context/page_context.template.json](data/page_context/page_context.template.json)

See [data/page_context/README.md](data/page_context/README.md) for the page-context schema (`page`, `url_path`, `selectors`, `actions`).

### End-to-end commands

From the **repository root** (with `.env` configured and `PW_BASE_URL` pointing at your app under test):

```bash
# 1) LLM: requirements → test case JSON + CSV (under output/, gitignored)
python -m src.agents.testcase_agent data/requirements/<stem>.md

# 2) LLM: test cases + page context → feature, steps, page object
python -m src.agents.playwright_generator_agent output/testcase_generated/<stem>_raw_output.json

# 3) Install JS runner once per clone
cd playwright-project && npm install && npx playwright install chromium

# 4) Generate BDD glue + run tests (npm test = bddgen + playwright test)
npm test
```

`playwright_generator_agent` scaffolds `playwright-project/` configs on first run if they are missing (`package.json`, `playwright.config.ts`, `cucumber.config.ts`, `fixtures/base.fixture.ts`).

### Run & debug Playwright locally

- **`playwright.config.ts`** loads the **repository root** `.env` (via `dotenv`) so `PW_BASE_URL` matches the Python side.
- **Headed vs headless:** with no `CI` variable, the browser runs **headed**. In CI (`CI=true`, including GitHub Actions), tests run **headless**.
- **Timeouts:** tests, expectations, actions, and navigation use **30s** caps; failures capture **screenshots** (and **trace** on first retry).
- **Clean output:** `global-setup.ts` deletes prior run folders under `playwright-project/` (`test-results`, `allure-results`, `playwright-report`, `blob-report`, `smart-reporter-output`) before each `playwright test` run. It does **not** remove `.features-gen` (produced by `bddgen` in the same `npm test`).

Validate step bindings only (no browser):

```bash
cd playwright-project && npx bddgen test
```

### GitHub Actions (CI)

Workflow: [`.github/workflows/playwright.yml`](.github/workflows/playwright.yml).

- Runs on **push** and **pull_request** to `main` / `master`.
- **Run workflow manually:** Actions → **Playwright** → **Run workflow** (optional **Playwright base URL** input).
- **`PW_BASE_URL`:** manual runs use the workflow input; push/PR use the **`PW_BASE_URL`** repository secret if set, otherwise `https://automationexercise.com`.
- On failure, uploads **test-results** (screenshots, traces) and **allure-results** as artifacts.

The checked-in **`payment_checkout`** feature under `playwright-project/` is implemented against **https://automationexercise.com** (demo credentials in the feature file). For your own app, regenerate from page context + requirements or replace selectors in steps.

### Editor: jump from `.feature` to step definitions

Install the **Cucumber** extension (`CucumberOpen.cucumber-official`). This workspace sets `cucumber.features` / `cucumber.glue` in [`.vscode/settings.json`](.vscode/settings.json) so glue under `playwright-project/steps/` resolves. Use **Go to Definition** (F12 / ⌘+click) on a step line.

### After generation (engineering checklist)

- Run `npx bddgen test` — every scenario step must bind to a step definition.
- In `.feature` files, avoid **nested double quotes** inside a quoted string (e.g. use single quotes inside selectors: `"[data-testid='TODO:foo']"`).
- In step definition patterns, **do not** use `/` between parameters (Cucumber treats it as alternation). Use `and` or separate parameters.
- Replace `TODO:` locators in generated code once real `data-testid` values are known (page context drives first generation).

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

- `data/requirements/` — requirement documents; use `requirements.template.md` or `scripts/bootstrap_bdd_suite.sh` for new suites.
- `data/page_context/` — one JSON per page under test for the Playwright generator (`<stem>_page.json`); see `page_context.template.json` and `README.md` there.
- `data/logs/` — includes a **demo** `sample_*.log` (tracked). Your own `*.log` files stay local (gitignored).
- `playwright-project/` — Playwright + playwright-bdd project (features, steps, pages, config); created/updated by `playwright_generator_agent`.
- `scripts/` — helper scripts (e.g. `bootstrap_bdd_suite.sh`).
- `src/core/` — LLM client, utilities, logging, cost helper.
- `src/agents/` — CLI entrypoints: testcase agent, log analyzer, **playwright_generator_agent**.
- `output/` — generated on each run (gitignored). The log analyzer writes three files per run: a full technical report (`_analysis.txt`), a structured JSON summary (`_analysis.json`) for tools or pipelines, and a short plain-English paragraph (`_executive.txt`) written for anyone who doesn't read logs. Test-case JSON lives under `output/testcase_generated/`.
- `.github/workflows/` — CI workflows (Playwright E2E).

## Contributing

Open an issue or pull request on GitHub for bugs, ideas, or improvements.

## License

This project is licensed under the [MIT License](LICENSE). You may use, copy, modify, and distribute the code, including in commercial projects, as long as you keep the license and copyright notice. There is no warranty; use at your own risk.
