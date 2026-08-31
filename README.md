# AuditMe

Node.js + Playwright CLI that audits a URL for functional, metadata/SEO, and accessibility issues.

## Usage

```bash
npm install
npx playwright install chromium

node audit.js https://the-internet.herokuapp.com/status_codes/500
node audit.js https://example.com --format both --output ./output
```

Exit code is `1` when any finding has severity `error` (usable as a CI gate).

### Options

| Flag | Description |
| --- | --- |
| `-f, --format <type>` | `json` (default), `html`, or `both` |
| `-o, --output <dir>` | Write `audit.json` / `audit.html` here |
| `--browser <name>` | `chromium` (default), `firefox`, or `webkit` |
| `--timeout <ms>` | Navigation timeout (default `30000`) |
| `--no-headless` | Show the browser |
| `-q, --quiet` | Do not print the report to stdout |

## Project structure

```
audit.js              CLI entrypoint (commander)
lib/runner.js         Browser launch + check orchestration
checks/               One module per check category
  functional.js       HTTP >= 400, uncaught JS errors
  metadata.js         Title, description, canonical, OG, img alt
  accessibility.js    @axe-core/playwright
reports/              JSON + HTML formatters
tests/                Node test runner + HTML fixtures
.github/workflows/    CI
```

Generated files go to `output/` (gitignored), not the `reports/` source folder.

## Scripts

```bash
npm test
npm run audit -- <url>
```

## Test targets

Use [the-internet.herokuapp.com](https://the-internet.herokuapp.com/) for live failure scenarios (e.g. `/status_codes/500`). Check modules are unit-tested against local fixture pages so CI does not depend on that site.
