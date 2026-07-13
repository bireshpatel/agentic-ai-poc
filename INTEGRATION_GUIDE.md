# Integration Guide: Python Agents + Playwright BDD Tests

## Overview

This project combines two automation pipelines:
1. **Python Agents** - Generate test cases and analyze logs using LLMs
2. **Playwright BDD** - Execute automated tests against web applications

This document describes how these pipelines work together and the manual review process.

---

## Output Pipelines

### 1. Test Case Generation (`output/testcase_generated/`)

**Source:** `src/agents/testcase_agent.py`  
**Input:** Requirement markdown files from `data/requirements/`  
**Output:**
- `{requirement}_testcases.csv` - Test case table (TestID, Title, Steps, Expected, Priority)
- `{requirement}_raw_output.json` - Raw LLM response
- `{requirement}_raw_output.txt` - Raw LLM text response

**Integration Workflow:**

1. **Generate:** Run the test case agent
   ```bash
   uv run python -m src.agents.testcase_agent
   ```

2. **Review:** Open the CSV file and manually verify:
   - Test case clarity and completeness
   - Alignment with requirements
   - Feasibility for automation
   - No redundancy or gaps

3. **Map to BDD:** For each test case in the CSV:
   - Add a corresponding scenario in `playwright-project/features/{requirement}.feature`
   - Use `@TC-{ID}` tag to link to generated test case ID
   - Implement step definitions in `playwright-project/steps/`

4. **Maintain Sync:** Keep both the CSV and .feature file in sync:
   - CSV = source of truth for test case metadata
   - .feature file = executable BDD scenarios
   - Reference CSV in comments at top of .feature file

**Example Mapping:**
```gherkin
@TC-001 @high @smoke
Scenario: Verify successful order placement with valid card
  # Source: output/testcase_generated/payment_checkout_testcases.csv row 1
  Given I am logged in as a registered user
  ...
```

---

### 2. Log Analysis (`output/log_analyzer/`)

**Source:** `src/agents/log_analyzer.py`  
**Input:** Log files from `data/logs/`  
**Output:**
- `{log_file}_analysis.txt` - Detailed technical analysis
- `{log_file}_analysis.json` - Structured findings (errors, severity, affected systems)
- `{log_file}_executive.txt` - Executive summary for stakeholders

**Integration Workflow:**

1. **Generate:** Run the log analyzer agent
   ```bash
   uv run python -m src.agents.log_analyzer
   ```

2. **Review:** QA/DevOps engineer reviews the output:
   - Validate AI-generated insights against actual log content
   - Check severity classifications (Critical/High/Medium/Low)
   - Identify systemic issues vs. one-off errors

3. **Create Regression Tests:** For critical errors identified:
   - Create test cases in Playwright to prevent future occurrences
   - Add tests to `playwright-project/features/` with `@regression` tag
   - Link to the analysis output for traceability

4. **Root Cause Tracking:**
   ```
   Log Analysis Output → Root Cause → Regression Test → CI/CD
   ```

---

## Setup & Execution

### Prerequisites

- **Python 3.9+** (via `uv`)
- **Node 18+** (for Playwright)
- LLM Provider API key (.env configured)

### Local Development

```bash
# Python environment
uv sync

# Node environment (from playwright-project/)
cd playwright-project
npm install

# Create .env from .env.example
cp .env.example .env
# Edit .env with your API keys and test credentials
```

### Run Test Case Agent

```bash
uv run python -m src.agents.testcase_agent [requirement_file]
# or
uv run python -m src.agents.testcase_agent
# (interactive menu)
```

### Run Log Analyzer Agent

```bash
uv run python -m src.agents.log_analyzer [log_file]
# or
uv run python -m src.agents.log_analyzer
# (interactive menu)
```

### Run Playwright Tests

```bash
cd playwright-project

# All tests
npm run test

# By tag
npm run test:smoke
npm run test:regression
npm run test:high

# With Allure reporting
npm run allure:generate
npm run allure:open
```

---

## Manual Review Checklist

### Test Case Review ✅

- [ ] Each CSV row has a clear, testable scenario
- [ ] Steps are specific (no vague assertions)
- [ ] Expected results match acceptance criteria
- [ ] Priority aligns with business impact
- [ ] No duplicate test cases across files
- [ ] Edge cases and negative scenarios included

### Log Analysis Review ✅

- [ ] Error counts and severity match log content
- [ ] Root causes are accurate and actionable
- [ ] Affected systems are correctly identified
- [ ] Recommendations are implementable
- [ ] Executive summary is accurate for stakeholders

### BDD Integration Review ✅

- [ ] Each @TC-XXX tag maps to a CSV entry
- [ ] .feature file comment references the source CSV
- [ ] All steps have matching implementations in steps/ directory
- [ ] Test data in .env or support/testData.ts matches requirements
- [ ] No hardcoded credentials (use .env)

---

## Best Practices

### 1. Version Control

- ✅ **Commit:** `.feature` files, `pyproject.toml`, `.env.example`
- ❌ **Never commit:** `.env`, API keys, test credentials, `node_modules/`, `.venv/`
- `.gitignore` is pre-configured; always verify before committing

### 2. Dependencies

- **Python:** Use `uv` for reproducibility
  - Single source of truth: `pyproject.toml`
  - `requirements.txt` is reference/legacy support only
  - ```bash
    uv sync  # Install from pyproject.toml
    ```

- **Node:** Use `package-lock.json` (committed)
  - ```bash
    npm install  # Uses lock file
    ```

### 3. Environment Variables

- Create `.env` from `.env.example` (never commit `.env`)
- Required keys:
  - **Python Agents:** `PROVIDER`, `MODEL`, API key (`OPENAI_API_KEY` or `GOOGLE_API_KEY`)
  - **Playwright:** `PW_BASE_URL`, `PW_TEST_EMAIL`, `PW_TEST_PASSWORD`
- In CI/CD, inject via secrets management (GitHub Actions, GitLab CI, etc.)

### 4. Test Data Management

- **Credentials:** Store in `.env` (loaded at runtime)
- **Shared test data:** `playwright-project/support/testData.ts`
- **Selectors:** `playwright-project/support/selectors.ts`
- **Large datasets:** Reference `data/` directory (ignored in git)

### 5. Output Artifacts

- **Generated outputs:** Temporary; not committed
  - `output/testcase_generated/` → reviewed, then mapped to .feature files
  - `output/log_analyzer/` → reviewed, then used for test creation
- **Test results:** Ignored in git
  - `playwright-project/test-results/`
  - `playwright-project/allure-results/`

---

## Troubleshooting

### Issue: "CSV test cases don't match .feature file scenarios"

**Fix:** Review and manually map each CSV row to a .feature file scenario. Update comments at the top of .feature files with CSV filename reference.

### Issue: "LLM output quality is low"

**Fix:** Review `data/requirements/` files:
- Are requirements clear and specific?
- Do they follow accepted industry format?
- Is context sufficient for the model?

### Issue: "Playwright tests fail due to stale selectors"

**Fix:** Update `playwright-project/support/selectors.ts` and corresponding Page Object in `playwright-project/pages/`.

---

## CI/CD Integration

Suggested pipeline:

1. **Trigger:** PR or scheduled job
2. **Python Agents:** Generate test cases & analyze logs
3. **Review:** Manual sign-off (code review + QA review)
4. **Playwright Tests:** Execute all regression tests
5. **Reporting:** Allure report + summary to Slack/Teams

---

## References

- [Playwright BDD Documentation](https://github.com/vitalets/playwright-bdd)
- [OpenAI API Docs](https://platform.openai.com/docs)
- [Google Gemini API Docs](https://ai.google.dev/docs)
- [Ollama Local LLM](https://ollama.ai)
