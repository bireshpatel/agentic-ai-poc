"""
playwright_generator.py

Reads:
  - output/testcase_generated/<stem>_raw_output.json (from testcase_generator), or
  - output/<stem>_testcases.json (hand-authored / copied JSON array)

Writes under playwright-project/:
  - features/<stem>.feature
  - steps/<stem>.steps.ts
  - pages/<PageName>Page.ts

Scaffold (only if missing): package.json, tsconfig.json, playwright.config.ts,
  cucumber.config.ts, fixtures/base.fixture.ts

Usage (from any cwd; paths resolved from repo root):
  python -m src.agents.playwright_generator output/testcase_generated/payment_checkout_raw_output.json

  # If output/payment_checkout_testcases.json does not exist, the same stem is tried
  # under output/testcase_generated/payment_checkout_raw_output.json (testcase_generator output).
  python -m src.agents.playwright_generator output/payment_checkout_testcases.json
"""

from __future__ import annotations

import argparse
import json
import sys
import time
from datetime import datetime, timezone
from pathlib import Path
from typing import Any, Dict, List, Optional, Tuple

from src.core import chat, get_logger, print_summary

logger = get_logger("Playwright Generator Agent")

ROOT = Path(__file__).resolve().parents[2]
PLAYWRIGHT_PROJECT_DIR = ROOT / "playwright-project"
PAGE_CONTEXT_DIR = ROOT / "data" / "page_context"
# Default output from testcase_generator (see src/agents/testcase_generator.py)
TESTCASE_AGENT_OUT = ROOT / "output" / "testcase_generated"
REPO_OUTPUT = ROOT / "output"


def _display_path(path: Path) -> str:
    try:
        return str(path.relative_to(ROOT))
    except ValueError:
        return str(path)


def load_test_cases(path: Path) -> List[Dict[str, Any]]:
    with path.open(encoding="utf-8") as f:
        data = json.load(f)
    if not isinstance(data, list):
        raise ValueError(f"Expected JSON array in {path}")
    return data


def load_page_context(path: Optional[Path]) -> Dict[str, Any]:
    if path is None or not path.exists():
        return {}
    with path.open(encoding="utf-8") as f:
        raw = json.load(f)
    return raw if isinstance(raw, dict) else {}


def stem_from(tc_path: Path) -> str:
    """payment_checkout_testcases / payment_checkout_raw_output → payment_checkout."""
    name = tc_path.stem
    if name.endswith("_testcases"):
        return name[: -len("_testcases")]
    if name.endswith("_raw_output"):
        return name[: -len("_raw_output")]
    return name


def resolve_testcase_path(user_path: Path) -> Path:
    """
    Resolve the testcase JSON path. If the file the user passed does not exist,
    try the same locations testcase_generator writes (e.g. *_raw_output.json).
    """
    p = user_path if user_path.is_absolute() else (ROOT / user_path).resolve()
    if p.exists():
        return p

    suite_stem = stem_from(p)
    seen: set = set()
    ordered: List[Path] = []
    for c in [
        TESTCASE_AGENT_OUT / f"{suite_stem}_raw_output.json",
        REPO_OUTPUT / f"{suite_stem}_testcases.json",
        REPO_OUTPUT / p.name,
    ]:
        if c not in seen:
            seen.add(c)
            ordered.append(c)

    for c in ordered:
        if c.exists():
            logger.info(
                "Using testcase file %s (you asked for %s, which was not found)",
                _display_path(c),
                _display_path(p),
            )
            return c

    tried = "\n".join(f"  - {_display_path(x)}" for x in [p] + ordered)
    logger.error(
        "Test case JSON not found.\nLooked for:\n%s\n\nRun testcase_generator first, e.g.:\n"
        "  python -m src.agents.testcase_generator data/requirements/<name>.md\n"
        "Then pass output/testcase_generated/<stem>_raw_output.json or copy it to output/<stem>_testcases.json",
        tried,
    )
    sys.exit(1)


def resolve_page_context(stem: str, explicit: Optional[Path]) -> Optional[Path]:
    if explicit is not None:
        return explicit
    candidate = PAGE_CONTEXT_DIR / f"{stem}_page.json"
    return candidate if candidate.exists() else None


def page_name_from_context(page_context: Dict[str, Any], stem: str) -> str:
    page = page_context.get("page")
    if isinstance(page, str) and page.strip():
        return page.strip()
    return stem.replace("_", " ").title().replace(" ", "") or "Generated"


def build_messages(
    test_cases: List[Dict[str, Any]],
    page_context: Dict[str, Any],
    page_name: str,
    artifact: str,
    source_tc: str,
    source_pc: str,
) -> List[Dict[str, str]]:
    tc_json = json.dumps(test_cases, indent=2)
    pc_json = (
        json.dumps(page_context, indent=2)
        if page_context
        else "No page context provided — use [data-testid=\"TODO:<semantic-name>\"] for missing locators."
    )
    ts = datetime.now(timezone.utc).isoformat(timespec="seconds")

    common = f"""Context (machine-readable):
UTC timestamp for file headers: {ts}
Test cases source file: {source_tc}
Page context source file: {source_pc}
Page object class basename (PascalCase): {page_name}

TEST CASES (JSON):
{tc_json}

PAGE CONTEXT (selectors and page metadata):
{pc_json}

RULES:
- Use only selectors from PAGE CONTEXT.selectors. For empty/missing keys use exactly: [data-testid="TODO:<key>"].
- Page Object Model only — no raw locators in step definitions.
- TypeScript only. No markdown fences or prose outside the artifact.
- Start the artifact with a short comment block including timestamp and the two source paths above.
"""

    if artifact == "feature":
        user = (
            common
            + """
OUTPUT: One Gherkin .feature file.
- One Scenario per test case; Scenario title = test case title.
- Tag each Scenario with @<id> (e.g. @TC-001) and @<priority_lowercase>.
- Optional Background if 3+ scenarios share the same leading steps.
- First comment lines MUST record sources as:
  # source: <test cases path> + <page context path or "(none)">
"""
        )
        return [
            {"role": "system", "content": "Reply with only Gherkin feature text."},
            {"role": "user", "content": user},
        ]

    if artifact == "steps":
        user = (
            common
            + f"""
OUTPUT: One TypeScript step definitions file for playwright-bdd (Playwright test runner).

Imports (exact pattern):
- import {{ BddWorld, Given, When, Then }} from '../fixtures/base.fixture';
- import {{ expect }} from '@playwright/test';
- import {{ {page_name}Page }} from '../pages/{page_name}Page';

Define:
  interface StepWorld extends BddWorld {{
    <camelCasePageRef>?: {page_name}Page;
  }}
Pick one camelCase property (e.g. paymentCheckoutPage) and use it consistently.

Every step: async function (this: StepWorld) {{ ... }}

Do NOT import from '@cucumber/cucumber'.
One step function per unique phrase; deduplicate.
Implement every Gherkin step used in scenarios and Background (use short scaffold comments for not-yet-automated preconditions if needed).
"""
        )
        return [
            {"role": "system", "content": "Reply with only TypeScript source."},
            {"role": "user", "content": user},
        ]

    if artifact == "page_object":
        user = (
            common
            + f"""
OUTPUT: One TypeScript Page Object module exporting class {page_name}Page.

- import {{ Page, Locator }} from '@playwright/test'
- One readonly Locator per PAGE CONTEXT.selectors key (camelCase properties).
- Methods from PAGE CONTEXT.actions where sensible (fill/click).
- navigate(): use ONLY this.page.goto(<url_path>) where url_path comes from PAGE CONTEXT — path must start with /. Playwright merges use.baseURL from playwright.config (set from PW_BASE_URL). Do NOT concatenate process.env.PW_BASE_URL in code.
- PAGE CONTEXT notes → JSDoc on the class.
"""
        )
        return [
            {"role": "system", "content": "Reply with only TypeScript source."},
            {"role": "user", "content": user},
        ]

    raise ValueError(f"Unknown artifact: {artifact}")


def write_file(path: Path, content: str) -> None:
    path.parent.mkdir(parents=True, exist_ok=True)
    path.write_text(content.strip() + "\n", encoding="utf-8")
    logger.info("Wrote %s", path.relative_to(ROOT))


def _response_and_metadata(result: Any) -> Tuple[str, Dict[str, Any]]:
    if isinstance(result, dict):
        text = str(result.get("response", ""))
        meta = result.get("metadata")
        if isinstance(meta, dict) and meta:
            return text, meta
    return ("" if result is None else str(result), {})


def _default_meta() -> Dict[str, Any]:
    return {
        "total_tokens": 0,
        "cost_usd": 0.0,
        "provider": "N/A",
        "model": "N/A",
        "token_source": "n/a",
    }


def _package_json() -> str:
    pkg = {
        "name": "playwright-project",
        "version": "1.0.0",
        "private": True,
        "scripts": {
            "test": "bddgen && playwright test",
            "bddgen": "bddgen",
            "test:allure": (
                "bddgen && playwright test && npx allure generate allure-results "
                "-o allure-report --clean && npx allure open allure-report"
            ),
            "report": "npx allure open allure-report",
        },
        "devDependencies": {
            "@playwright/test": "^1.49.0",
            "@types/node": "^20.11.0",
            "playwright-bdd": "^8.5.0",
            "@cucumber/cucumber": "^10.9.0",
            "allure-playwright": "^3.0.0",
            "allure-cucumberjs": "^3.0.0",
            "allure-commandline": "^2.29.0",
            "playwright-smart-reporter": "^1.6.5",
            "ts-node": "^10.9.2",
            "typescript": "^5.4.0",
        },
    }
    return json.dumps(pkg, indent=2) + "\n"


def _tsconfig_json() -> str:
    cfg = {
        "compilerOptions": {
            "target": "ES2022",
            "module": "commonjs",
            "strict": True,
            "esModuleInterop": True,
            "skipLibCheck": True,
            "outDir": "dist",
            "baseUrl": ".",
            "types": ["node"],
        },
        "include": ["**/*.ts"],
        "exclude": ["node_modules", "dist", ".features-gen"],
    }
    return json.dumps(cfg, indent=2) + "\n"


def _playwright_config_ts() -> str:
    return """// playwright.config.ts — generated by playwright_generator v1 (first run only)
// Engineer-owned after first generation.

import { defineConfig, devices } from '@playwright/test';
import { defineBddConfig } from 'playwright-bdd';

const testDir = defineBddConfig({
  features: 'features/**/*.feature',
  steps: 'steps/**/*.steps.ts',
  importTestFrom: 'fixtures/base.fixture',
});

export default defineConfig({
  testDir,
  timeout: 30_000,
  retries: 1,
  workers: process.env.CI ? 2 : 1,

  use: {
    baseURL: process.env.PW_BASE_URL,
    trace: 'on-first-retry',
    screenshot: 'only-on-failure',
  },

  reporter: [
    ['list'],

    // Allure — history, trends (see https://github.com/allure-framework/allure-js )
    [
      'allure-playwright',
      {
        detail: true,
        outputFolder: 'allure-results',
        suiteTitle: false,
      },
    ],

    // playwright-smart-reporter — HTML dashboard + history; AI analysis on paid tiers via license
    // Docs: https://www.npmjs.com/package/playwright-smart-reporter
    [
      'playwright-smart-reporter',
      {
        outputFile: 'smart-reporter-output/smart-report.html',
        historyFile: 'smart-reporter-output/test-history.json',
        maxHistoryRuns: 10,
      },
    ],
  ],

  projects: [
    {
      name: 'chromium',
      use: { ...devices['Desktop Chrome'] },
    },
  ],
});
"""


def _cucumber_config_ts() -> str:
    return """// cucumber.config.ts — optional CucumberJS CLI (primary runner: playwright-bdd + playwright test)
// Generated by playwright_generator v1 (first run only).

import type { IConfiguration } from '@cucumber/cucumber';

const config: Partial<IConfiguration> = {
  paths: ['features/**/*.feature'],
  require: ['steps/**/*.steps.ts', 'fixtures/base.fixture.ts'],
  requireModule: ['ts-node/register'],
  format: [
    'progress-bar',
    'allure-cucumberjs/reporter',
    'json:cucumber-report.json',
  ],
  formatOptions: {
    resultsDir: 'allure-results',
  },
  worldParameters: {},
};

export default config;
"""


def _base_fixture_ts() -> str:
    return """// fixtures/base.fixture.ts — generated by playwright_generator v1 (first run only)

import { test as base, createBdd } from 'playwright-bdd';
import type { Page } from '@playwright/test';

export class BddWorld {
  constructor(public readonly page: Page) {}
}

export const test = base.extend<{ world: BddWorld }>({
  world: async ({ page }, use) => {
    await use(new BddWorld(page));
  },
});

export const { Given, When, Then } = createBdd(test, { worldFixture: 'world' });
"""


def scaffold_if_missing() -> None:
    configs = [
        (PLAYWRIGHT_PROJECT_DIR / "package.json", _package_json()),
        (PLAYWRIGHT_PROJECT_DIR / "tsconfig.json", _tsconfig_json()),
        (PLAYWRIGHT_PROJECT_DIR / "playwright.config.ts", _playwright_config_ts()),
        (PLAYWRIGHT_PROJECT_DIR / "cucumber.config.ts", _cucumber_config_ts()),
        (PLAYWRIGHT_PROJECT_DIR / "fixtures" / "base.fixture.ts", _base_fixture_ts()),
    ]
    for path, content in configs:
        if path.exists():
            continue
        write_file(path, content)
        logger.info("Scaffolded (first run): %s", path.relative_to(ROOT))


def main() -> None:
    parser = argparse.ArgumentParser(
        description="Generate Playwright-BDD scaffold from testcase JSON",
    )
    parser.add_argument(
        "testcases",
        type=Path,
        help="Path to *_testcases.json or output/testcase_generated/*_raw_output.json",
    )
    parser.add_argument(
        "--page-context",
        type=Path,
        default=None,
        help="Page context JSON (default: data/page_context/<stem>_page.json)",
    )
    args = parser.parse_args()

    tc_path = resolve_testcase_path(Path(args.testcases))

    stem = stem_from(tc_path)

    explicit_pc: Optional[Path] = None
    if args.page_context is not None:
        p = Path(args.page_context)
        explicit_pc = p.resolve() if p.is_absolute() else (ROOT / p).resolve()
        if not explicit_pc.exists():
            logger.error("Page context not found: %s", explicit_pc)
            sys.exit(1)

    pc_path = resolve_page_context(stem, explicit_pc)

    start = time.time()
    llm_calls = 0
    metadata: Optional[Dict[str, Any]] = None

    try:
        test_cases = load_test_cases(tc_path)
        page_context = load_page_context(pc_path)
        page_name = page_name_from_context(page_context, stem)

        source_tc = _display_path(tc_path)
        source_pc = _display_path(pc_path) if pc_path else "(none)"

        logger.info("playwright_generator — test cases: %s", source_tc)
        logger.info("  page context: %s", source_pc)
        logger.info("  page name: %s", page_name)

        total_tokens = 0
        total_cost = 0.0
        last_meta: Dict[str, Any] = _default_meta()

        artifacts: List[Tuple[str, Path]] = [
            ("feature", PLAYWRIGHT_PROJECT_DIR / "features" / f"{stem}.feature"),
            ("steps", PLAYWRIGHT_PROJECT_DIR / "steps" / f"{stem}.steps.ts"),
            ("page_object", PLAYWRIGHT_PROJECT_DIR / "pages" / f"{page_name}Page.ts"),
        ]

        for kind, out_path in artifacts:
            logger.info("Generating %s ...", kind)
            messages = build_messages(
                test_cases,
                page_context,
                page_name,
                kind,
                source_tc,
                source_pc,
            )
            result = chat(messages)
            llm_calls += 1
            text, meta = _response_and_metadata(result)
            last_meta = {**_default_meta(), **meta}
            total_tokens += int(last_meta.get("total_tokens", 0) or 0)
            total_cost += float(last_meta.get("cost_usd", 0.0) or 0.0)
            write_file(out_path, text)

        metadata = {**last_meta, "total_tokens": total_tokens, "cost_usd": total_cost}

        scaffold_if_missing()

        duration = time.time() - start
        print_summary(duration, metadata, llm_calls, "Success")
        logger.info(
            "Next: cd playwright-project && npm install && npx playwright install && npm test",
        )

    except Exception as exc:
        logger.exception("Agent failed: %s", exc)
        duration = time.time() - start
        if metadata is None:
            metadata = _default_meta()
        print_summary(duration, metadata, llm_calls, "Failed")
        raise


if __name__ == "__main__":
    main()
