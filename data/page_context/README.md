# Page context (`data/page_context`)

Copy [`page_context.template.json`](page_context.template.json) to `<stem>_page.json`, or from the **repository root** run `bash scripts/bootstrap_bdd_suite.sh <stem>`.

One JSON file per page under test. Naming convention:

| Test-case stem | Page context file |
|----------------|-------------------|
| `payment_checkout` | `payment_checkout_page.json` |

The `playwright_generator` resolves paths from the repo root and auto-loads `data/page_context/<stem>_page.json` when the testcase stem matches (`*_testcases.json` or `*_raw_output.json` from `output/testcase_generated/`). Override with `--page-context`.

## Schema

| Field | Type | Required | Notes |
|-------|------|----------|--------|
| `page` | string | yes | PascalCase — becomes the Page Object class name (`PaymentCheckout` → `PaymentCheckoutPage`). |
| `description` | string | no | Human-readable; useful for prompts and docs. |
| `url_path` | string | yes | Path starting with `/` — generated `navigate()` uses `page.goto(url_path)`; Playwright merges `use.baseURL` from config (`PW_BASE_URL` in `.env`). |
| `selectors` | object | yes | Keys are semantic names (camelCase). Values are real locator strings or `""` for TODO placeholders. |
| `actions` | object | no | Hints: values like `fill`, `click`, `toBeVisible` guide generated methods. |
| `notes` | string | no | Free text — emitted as JSDoc on the generated Page Object class. |

### Selector rules

- Non-empty values are copied verbatim into `page.locator(...)`.
- Empty strings produce `'[data-testid="TODO:<key>"]'` in generated TypeScript so engineers can `grep TODO:`.

### Example

See `payment_checkout_page.json`.
