# AuditMe

Node.js + Playwright tool that audits a URL for functional, metadata/SEO, and accessibility issues. Ships two ways to use it: a CLI, and a small web app (Express API + React frontend) that wraps the same audit engine.

## CLI usage

```bash
npm install
npx playwright install chromium

node audit.js https://the-internet.herokuapp.com/status_codes/500
node audit.js https://example.com --format both --output ./output
```

Exit code is `1` when any finding has severity `error` (usable as a CI gate).

### CLI options

| Flag | Description |
| --- | --- |
| `-f, --format <type>` | `json` (default), `html`, or `both` |
| `-o, --output <dir>` | Write `audit.json` / `audit.html` here |
| `--browser <name>` | `chromium` (default), `firefox`, or `webkit` |
| `--timeout <ms>` | Navigation timeout (default `30000`) |
| `--no-headless` | Show the browser window |
| `-q, --quiet` | Do not print the report to stdout |

## Web app usage

The same `runAudit()` engine is wrapped in a small Express API, with a React (Vite) frontend to drive it from a browser instead of the CLI. It's a local-only demo — nothing is deployed.

```bash
npm install
npx playwright install chromium
npm --prefix web install
```

**Dev mode** (frontend hot-reloads, proxies API calls to the backend):

```bash
npm run server              # terminal 1 — API on http://localhost:3001
npm --prefix web run dev    # terminal 2 — UI on http://localhost:5173
```

**Single-port demo mode** (build the frontend once, Express serves both API and UI):

```bash
npm run build    # builds web/dist
npm run server   # http://localhost:3001 serves the built UI + API
```

### API

| Endpoint | Description |
| --- | --- |
| `GET /api/health` | Liveness check |
| `POST /api/audits` | Body: `{ "url": "...", "browser"?: "chromium"\|"firefox"\|"webkit", "timeout"?: ms }`. Returns the same result shape as the CLI's JSON output. `400` for a missing/malformed `url` or unsupported protocol/browser, `502` if the audit itself fails (bad host, navigation timeout, etc). |

Only `http`/`https` URLs are accepted. This is a basic input guard, not full SSRF protection — it doesn't block private/internal IP ranges. Fine for local use; would need hardening before ever being exposed publicly.

## Project structure

```
audit.js              CLI entrypoint (commander)
lib/runner.js         Browser launch + check orchestration
checks/               One module per check category
  functional.js       HTTP >= 400, uncaught JS errors
  metadata.js          Title, description, canonical, OG, img alt
  accessibility.js    @axe-core/playwright
reports/              JSON + HTML formatters
server/               Express API wrapping lib/runner.js
web/                  React (Vite) frontend
tests/                Node test runner + HTML fixtures
.github/workflows/    CI
```

Generated files go to `output/` (gitignored), not the `reports/` source folder. `web/dist/` (the frontend build) is also gitignored — build it locally with `npm run build`.

## Scripts

```bash
npm test
npm run audit -- <url>
npm run server
npm run build
```

## Test targets

Use [the-internet.herokuapp.com](https://the-internet.herokuapp.com/) for live failure scenarios (e.g. `/status_codes/500`). Check modules are unit-tested against local fixture pages so CI does not depend on that site.
