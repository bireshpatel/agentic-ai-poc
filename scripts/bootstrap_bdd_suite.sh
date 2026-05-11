#!/usr/bin/env bash
# Copy starter files for a new Playwright-BDD suite. Usage from repo root:
#   bash scripts/bootstrap_bdd_suite.sh <stem>
# Example: bash scripts/bootstrap_bdd_suite.sh order_history
# Creates data/requirements/<stem>.md and data/page_context/<stem>_page.json from templates.

set -euo pipefail

STEM="${1:?Usage: $0 <stem> — lowercase snake_case, e.g. order_history}"

ROOT="$(cd "$(dirname "$0")/.." && pwd)"
REQ_DST="$ROOT/data/requirements/${STEM}.md"
PC_DST="$ROOT/data/page_context/${STEM}_page.json"

if [[ -e "$REQ_DST" ]] || [[ -e "$PC_DST" ]]; then
  echo "Refusing to overwrite existing:" >&2
  [[ -e "$REQ_DST" ]] && echo "  $REQ_DST" >&2
  [[ -e "$PC_DST" ]] && echo "  $PC_DST" >&2
  exit 1
fi

cp "$ROOT/data/requirements/requirements.template.md" "$REQ_DST"
cp "$ROOT/data/page_context/page_context.template.json" "$PC_DST"

echo "Created:"
echo "  $REQ_DST"
echo "  $PC_DST"
echo ""
echo "Next:"
echo "  1. Edit the requirement doc and page context (set \"page\" PascalCase name and real selectors)."
echo "  2. python -m src.agents.testcase_agent data/requirements/${STEM}.md"
echo "  3. python -m src.agents.playwright_generator_agent output/testcase_generated/${STEM}_raw_output.json"
echo "  4. cd playwright-project && npm install && npx playwright install chromium && npm test"
