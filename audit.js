const { chromium } = require('playwright');
const { runAllChecks, collectFindings } = require('./checks');
const { formatJson } = require('./reports');

async function main() {
  const url = process.argv[2];

  if (!url) {
    console.error('Usage: node audit.js <url>');
    process.exit(1);
  }

  const browser = await chromium.launch();
  const page = await browser.newPage();

  // Register listeners before navigation so nothing is missed
  await runAllChecks(page);
  await page.goto(url);

  const result = {
    url,
    findings: collectFindings(),
  };

  console.log(formatJson(result));

  await browser.close();
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
