const puppeteer = require("puppeteer");

(async () => {
    try {
        const browser = await puppeteer.launch();
        const page = await browser.newPage();

        page.on('console', msg => {
            if (msg.type() === 'error') {
                console.log('BROWSER ERROR:', msg.text());
            }
        });

        page.on('pageerror', err => {
            console.log('PAGE ERROR:', err.message);
        });

        await page.goto("http://localhost:5174", { waitUntil: 'load', timeout: 10000 });

        // Wait a bit to catch any deferred React errors
        await new Promise(r => setTimeout(r, 2000));

        await browser.close();
    } catch (err) {
        console.error("Puppeteer Error:", err);
    }
})();
