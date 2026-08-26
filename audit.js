const { chromium } = require('playwright'); 
(async () => { const browser = await chromium.launch(); 
    const page = await browser.newPage(); await page.goto(process.argv[2]); 
    const title = await page.title(); console.log('Page title:', title); 
    await browser.close(); })();