const { chromium } = require('playwright'); 
(async () => { const browser = await chromium.launch(); 
    const page = await browser.newPage();  
    
    page.on('response', response => {
        console.log('Response:', response.status(), 'URL:', response.url())
    })
    page.on('error', error => {
        console.log('Error:', error)
    })
    await page.goto(process.argv[2]);
    const title = await page.title(); console.log('Page title:', title); 
    await browser.close(); })();