const puppeteer = require('puppeteer');

(async () => {
    console.log('Launching browser...');
    const browser = await puppeteer.launch({
        headless: true,
        args: ['--no-sandbox', '--disable-setuid-sandbox']
    });
    const page = await browser.newPage();

    // Listen to console events
    page.on('console', msg => {
        console.log(`[CONSOLE ${msg.type().toUpperCase()}] ${msg.text()}`);
    });

    // Listen to page errors
    page.on('pageerror', err => {
        console.error('[PAGE ERROR]', err.message);
    });

    console.log('Navigating to live article page...');
    const response = await page.goto('https://www.aperionx.com/makale/yaslanmayi-durdurmak-mumkun-mu-hucrelerimizdeki-omur-kumbaralari-telomerler', {
        waitUntil: 'domcontentloaded',
        timeout: 60000
    });

    console.log('Response Status:', response.status());

    // Wait 3 seconds for client scripts to finish rendering
    console.log('Waiting 3 seconds...');
    await new Promise(r => setTimeout(r, 3000));

    // Inspect image element
    const imgInfo = await page.evaluate(() => {
        const img = document.getElementById('detail-image');
        if (!img) return { exists: false };
        
        const style = window.getComputedStyle(img);
        return {
            exists: true,
            src: img.src,
            tagName: img.tagName,
            offsetWidth: img.offsetWidth,
            offsetHeight: img.offsetHeight,
            display: style.display,
            visibility: style.visibility,
            opacity: style.opacity,
            naturalWidth: img.naturalWidth,
            naturalHeight: img.naturalHeight,
            complete: img.complete
        };
    });

    console.log('Image Element Info:', JSON.stringify(imgInfo, null, 2));

    await browser.close();
    console.log('Done!');
})();
