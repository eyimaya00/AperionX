const puppeteer = require('puppeteer');

(async () => {
    const browser = await puppeteer.launch();
    const page = await browser.newPage();
    await page.setViewport({ width: 1920, height: 1080 });
    await page.goto('http://localhost:3000', { waitUntil: 'networkidle2' });
    
    // Take full page screenshot
    await page.screenshot({ path: 'scratch/fix_full.png', fullPage: true });
    
    // Take viewport screenshot after scroll
    await page.evaluate(() => window.scrollBy(0, 900));
    await new Promise(resolve => setTimeout(resolve, 500));
    await page.screenshot({ path: 'scratch/fix_scrolled.png' });
    
    await browser.close();
    console.log("Done");
})();
