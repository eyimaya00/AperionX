const puppeteer = require('puppeteer');

(async () => {
    const browser = await puppeteer.launch();
    const page = await browser.newPage();
    await page.setViewport({ width: 1920, height: 1080 });
    await page.goto('http://localhost:3000', { waitUntil: 'networkidle2' });
    
    // Evaluate logic to scroll down
    await page.evaluate(() => {
        window.scrollBy(0, 800);
    });
    
    // Wait for a second for animations/scroll
    await new Promise(resolve => setTimeout(resolve, 1000));
    
    await page.screenshot({ path: 'scratch/screenshot3.png' });
    
    await browser.close();
    console.log("Screenshots saved to scratch/screenshot3.png");
})();
