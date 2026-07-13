# .gitignore and Environment Best Practices

## Overview

Protecting sensitive data and managing project artifacts is critical for security and maintainability.

---

## .gitignore Best Practices

### ✅ What's Covered

This project's `.gitignore` includes comprehensive patterns for:

#### Python Virtual Environments
```
.venv/
venv/
env/
.env/
```
**Why:** Virtual environments are large, machine-specific, and can be regenerated via `uv sync` or `pip install -e .`

**Best Practice:**
- Always create .venv in the project root
- Add it to .gitignore (already done)
- Include `.venv` setup steps in README (already done)
- In CI/CD, use `uv sync` to reproduce exact environment

#### Node.js Packages
```
playwright-project/node_modules/
```
**Why:** `node_modules/` is large, platform-specific, and can be regenerated via `npm install`

**Best Practice:**
- Always commit `package-lock.json` (provides reproducibility)
- Never commit `node_modules/`
- In CI/CD, use `npm ci` (cleaner install from lock file)

#### Environment Secrets
```
.env
.env.*
!.env.example
*.pem
```
**Why:** Prevents accidental credential leaks

**Best Practice:**
- `.env.example` is tracked (template only)
- `.env` is never committed (use only locally)
- All secrets must be populated at runtime:
  - **Local:** Copy `.env.example` → `.env` and edit manually
  - **CI/CD:** Use secrets manager (GitHub Actions, GitLab CI, etc.)
  - **Production:** Inject via environment variables, not files

#### Build Artifacts & Cache
```
build/
dist/
*.egg-info/
.pytest_cache/
.coverage/
__pycache__/
*.pyc
```
**Why:** These are generated at build time and platform-specific

**Best Practice:**
- Never commit build artifacts
- Generate fresh in each environment
- Let CI/CD handle builds from scratch

#### IDE & Editor Files
```
.idea/
.vscode/*
!.vscode/extensions.json
!.vscode/settings.json.example
*.swp
*.swo
*~
```
**Why:** IDE settings are personal; committing them causes merge conflicts

**Best Practice:**
- Share VS Code workspace settings via `.vscode/settings.json.example`
- Never commit `.vscode/settings.json` (personal preferences)
- Team-wide linter/formatter configs go in project root (`.eslintrc`, `.prettierrc`, etc.)

#### OS-Generated Files
```
.DS_Store          # macOS
Thumbs.db          # Windows
.git_*             # Git temporary files
```
**Why:** OS metadata is not part of the project

#### Test Outputs & Logs
```
playwright-project/test-results/
playwright-project/allure-results/
/logs/
*.log
!data/logs/sample_*.log
```
**Why:** Test results are generated at runtime; sample logs are tracked

**Best Practice:**
- Ignore test outputs in git
- Track sample/synthetic data (e.g., `sample_ecommerce.log`) for quick starts
- User logs stay local; never commit

#### AI/ML Models & Data
```
*.pt
*.pth
*.onnx
*.h5
output/
outputs/
```
**Why:** Models are large; generated outputs are temporary

**Best Practice:**
- Store large models in cloud storage (S3, GCS, Hugging Face Hub)
- Reference model URLs in `.env` or config files
- Never commit model files to git

---

## Virtual Environment Management

### Python: `uv` Workflow

**Setup (first time):**
```bash
cd agentic-ai-poc
uv sync
```

**Verify .venv exists:**
```bash
ls -la | grep venv
```

**Run Python (uses .venv automatically):**
```bash
uv run python -m src.agents.testcase_agent
uv run python script.py
```

**Add a dependency:**
```bash
uv add package_name
# Updates pyproject.toml and uv.lock
```

**Activate .venv manually (if needed):**
```bash
source .venv/bin/activate
# Now you're in the venv; use `python` directly
python -m src.agents.testcase_agent

# Deactivate
deactivate
```

**Why .venv/ is gitignored:**
- .venv is platform-specific (macOS, Linux, Windows differ)
- `uv.lock` provides reproducibility (commit this)
- `pyproject.toml` is the source (commit this)
- Any machine can run `uv sync` to recreate .venv

---

### Node.js: npm Workflow

**Setup (first time):**
```bash
cd playwright-project
npm install
```

**Verify node_modules exists:**
```bash
ls -la | grep node_modules
```

**Run tests (uses node_modules automatically):**
```bash
npm run test
npm run test:smoke
```

**Add a dependency:**
```bash
npm install --save package_name
# or
npm install --save-dev package_name   # for dev dependencies
# Updates package.json and package-lock.json
```

**Why node_modules/ is gitignored:**
- node_modules is large (~500MB in this project)
- Platform-specific binaries are included
- `package-lock.json` provides reproducibility (commit this)
- Any machine can run `npm ci` to recreate node_modules

---

## Environment Variable Security

### Local Development

1. **Create .env from template:**
   ```bash
   cp .env.example .env
   ```

2. **Edit .env with real values:**
   ```bash
   # .env
   OPENAI_API_KEY=sk-proj-YOUR_KEY_HERE
   GOOGLE_API_KEY=YOUR_GOOGLE_KEY
   PW_TEST_EMAIL=test@automation.com
   PW_TEST_PASSWORD=TestPass123
   ```

3. **Verify .env is ignored:**
   ```bash
   git status  # .env should NOT appear
   ```

4. **Verify loading works:**
   ```bash
   uv run python -c "from dotenv import load_dotenv; load_dotenv(); import os; print(os.getenv('OPENAI_API_KEY')[:10])"
   ```

### CI/CD Pipeline

**GitHub Actions Example:**
```yaml
name: Test

on: [push, pull_request]

jobs:
  test:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      - uses: astral-sh/setup-uv@v1
      - run: uv sync
      
      # Set secrets as env variables (NOT in .env file)
      - run: |
          uv run python -m src.agents.testcase_agent
        env:
          OPENAI_API_KEY: ${{ secrets.OPENAI_API_KEY }}
          GOOGLE_API_KEY: ${{ secrets.GOOGLE_API_KEY }}
          PW_TEST_EMAIL: ${{ secrets.PW_TEST_EMAIL }}
          PW_TEST_PASSWORD: ${{ secrets.PW_TEST_PASSWORD }}
```

**Key principle:** Secrets are injected at runtime; they never touch git or disk (except in memory).

---

## Spotting Leaks & Cleanup

### Check if Secrets are Already in History

```bash
# Search for API key patterns
git log -p --all --source --grep="OPENAI_API_KEY" -- .env
git log -p --all -S "sk-proj-" -- .env   # OpenAI key prefix

# Search entire history
git log --oneline --all | head -20  # Check recent commits
```

### If Secrets are Leaked

1. **Revoke immediately:**
   - OpenAI: https://platform.openai.com/api-keys (delete and regenerate)
   - Google: https://aistudio.google.com/apikey (delete and regenerate)
   - GitHub/personal accounts: Change password

2. **Clean git history:**
   - Option A (BFG - recommended for single files):
     ```bash
     bfg --delete-files .env
     git reflog expire --expire=now --all
     git gc --prune=now --aggressive
     ```
   - Option B (git-filter-branch - manual):
     ```bash
     git filter-branch --force --index-filter \
       "git rm --cached --ignore-unmatch .env" \
       --prune-empty --tag-name-filter cat -- --all
     ```

3. **Force push (if repo is private or you have permissions):**
   ```bash
   git push --force-with-lease origin main
   ```

4. **Notify team:** If pushed to shared repo, all collaborators should pull updated history.

---

## Audit Checklist

Run this before every push:

```bash
# ✅ No .env file
git status | grep ".env"  # Should return nothing

# ✅ .venv/ not tracked
git ls-files | grep ".venv"  # Should return nothing

# ✅ node_modules/ not tracked
git ls-files | grep "node_modules"  # Should return nothing

# ✅ package-lock.json IS tracked
git ls-files | grep "package-lock.json"  # Should show the file

# ✅ pyproject.toml IS tracked
git ls-files | grep "pyproject.toml"  # Should show the file

# ✅ .env.example IS tracked
git ls-files | grep ".env.example"  # Should show the file

# ✅ No keys in commits
git log -p --all -S "sk-proj-" | head  # Should be empty
git log -p --all -S "OPENAI_API_KEY=" | head  # Should be empty

# ✅ Staged changes don't include .env
git diff --cached | grep "OPENAI_API_KEY\|PASSWORD"  # Should be empty
```

---

## Summary: Good Practices

| Artifact | Commit? | Why |
|----------|---------|-----|
| `.venv/` | ❌ | Machine-specific; regenerated via `uv sync` |
| `node_modules/` | ❌ | Platform-specific binaries; regenerated via `npm ci` |
| `.env` | ❌ | **NEVER** — contains secrets |
| `.env.example` | ✅ | Template for teammates; safe (no real values) |
| `pyproject.toml` | ✅ | Python dependency source of truth |
| `uv.lock` | ✅ | Ensures reproducible Python environments |
| `package.json` | ✅ | Node dependency manifest |
| `package-lock.json` | ✅ | Ensures reproducible Node environments |
| `output/` | ❌ | Generated artifacts; regenerated on each run |
| `playwright-project/test-results/` | ❌ | Temporary test artifacts |
| `playwright-project/allure-results/` | ❌ | Temporary test reports |
| `data/requirements/*.md` | ✅ | Source requirements (tracked) |
| `data/logs/sample_*.log` | ✅ | Sample data for quick starts |
| `.gitignore` | ✅ | Specifies what to ignore (this is critical!) |

---

## Further Reading

- [Git .gitignore Documentation](https://git-scm.com/docs/gitignore)
- [OWASP: Secrets Management](https://cheatsheetseries.owasp.org/cheatsheets/Secrets_Management_Cheat_Sheet.html)
- [GitHub: Protecting Secrets](https://docs.github.com/en/actions/security-guides/encrypted-secrets)
- [uv Documentation](https://docs.astral.sh/uv/)
- [npm docs: package-lock.json](https://docs.npmjs.com/cli/v7/configuring-npm/package-lock-json)
