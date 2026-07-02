const { chromium } = require('@playwright/test');
(async () => {
  const browser = await chromium.launch();
  const page = await browser.newPage();
  await page.goto('http://localhost:5173');
  // Wait for the app to load
  await page.waitForTimeout(2000);
  // Click on the Petty Cash tab
  await page.click('text="Petty Cash"');
  await page.waitForTimeout(2000);
  // Take screenshot
  await page.screenshot({ path: 'petty_cash_screenshot.png', fullPage: true });
  await browser.close();
})();
