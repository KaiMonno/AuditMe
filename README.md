# AuditMe

Node.js + Playwright CLI that audits websites for functional, accessibility, and metadata/SEO issues.

## Usage

```bash
npm install
node audit.js https://example.com
```

## Project structure

```
audit.js              CLI entrypoint
checks/               One module per check category
  functional.js       HTTP errors, JS errors
  metadata.js         Title, meta tags, OG tags
  accessibility.js    axe-core integration (planned)
reports/              Output formatters (JSON, HTML)
tests/                Unit tests + HTML fixtures
  fixtures/           Static pages for isolated check tests
.github/workflows/    CI
```

Generated audit output should go to `output/` (gitignored), not the `reports/` source folder.

## Scripts

```bash
npm test    # Run unit tests (Node built-in test runner)
npm run audit -- <url>
```

## Test targets

Use [the-internet.herokuapp.com](https://the-internet.herokuapp.com/) for failure scenarios (e.g. `/status_codes/500`) rather than only clean pages like example.com.
