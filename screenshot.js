const { chromium } = require('playwright');

(async () => {
  const browser = await chromium.launch();
  const page = await browser.newPage();
  await page.setViewportSize({ width: 1280, height: 800 });
  
  await page.goto('http://localhost:5173/login');
  await page.fill('input[type="email"]', 'admin@shipproof.dev');
  await page.fill('input[type="password"]', 'changeme123');
  await page.click('button[type="submit"]');
  
  await page.waitForTimeout(3000);
  await page.goto('http://localhost:5173/report');
  await page.waitForTimeout(3000);
  
  await page.screenshot({ path: '/home/mehru/.gemini/antigravity/brain/6d94d429-16d9-4729-8416-2e082d73704e/report.png' });
  
  await browser.close();
})();
