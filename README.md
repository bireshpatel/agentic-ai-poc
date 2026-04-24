# agentic-ai-poc

Small Python PoC for **LLM-backed agents**: generate test cases from requirement markdown, analyze logs, and track rough token/cost estimates (where supported).

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
# Place log files under data/logs/ (not tracked; see .gitignore).
```

Generated artifacts go under `output/` (gitignored).

## Layout

- `data/requirements/` — example requirement documents (tracked).
- `data/logs/` — put your own `.log` files here for analysis (not tracked).
- `src/core/` — LLM client, utilities, logging, cost helper.
- `src/agents/` — CLI entrypoints for test-case and log analysis agents.

## License

Add a `LICENSE` file of your choice before publishing if you need explicit terms.
