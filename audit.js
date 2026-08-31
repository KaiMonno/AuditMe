#!/usr/bin/env node

const fs = require('node:fs');
const path = require('node:path');
const { program } = require('commander');
const { runAudit } = require('./lib/runner');
const { formatJson, formatHtml } = require('./reports');

function writeReports(result, format, outputDir) {
  const formats = format === 'both' ? ['json', 'html'] : [format];
  const written = [];

  if (!outputDir) return written;

  fs.mkdirSync(outputDir, { recursive: true });

  for (const kind of formats) {
    const file = path.join(outputDir, `audit.${kind}`);
    const body = kind === 'html' ? formatHtml(result) : formatJson(result);
    fs.writeFileSync(file, body, 'utf8');
    written.push(file);
  }

  return written;
}

async function main(url, opts) {
  const result = await runAudit(url, {
    browser: opts.browser,
    headless: opts.headless,
    timeout: Number(opts.timeout),
  });

  const written = writeReports(result, opts.format, opts.output);

  if (!opts.quiet) {
    if (opts.format === 'html' && !opts.output) {
      process.stdout.write(formatHtml(result));
    } else {
      process.stdout.write(formatJson(result) + '\n');
    }
  }

  for (const file of written) {
    console.error(`Wrote ${file}`);
  }

  // Non-zero exit makes this usable as a CI gate.
  const failed = result.summary.error > 0;
  process.exitCode = failed ? 1 : 0;
}

program
  .name('auditme')
  .description('Audit a URL for functional, metadata/SEO, and accessibility issues')
  .argument('<url>', 'URL to audit')
  .option('-f, --format <type>', 'json, html, or both', 'json')
  .option('-o, --output <dir>', 'write report files to this directory')
  .option('--browser <name>', 'chromium, firefox, or webkit', 'chromium')
  .option('--timeout <ms>', 'navigation timeout in milliseconds', '30000')
  .option('--no-headless', 'show the browser window')
  .option('-q, --quiet', 'do not print the report to stdout')
  .action((url, opts) => {
    const format = opts.format;
    if (!['json', 'html', 'both'].includes(format)) {
      console.error('Invalid --format. Use json, html, or both.');
      process.exit(1);
    }

    main(url, opts).catch((err) => {
      console.error(err);
      process.exit(1);
    });
  });

program.parseAsync(process.argv);
