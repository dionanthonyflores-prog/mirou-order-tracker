// Every test file imports `test` and `expect` from here instead of from Playwright directly.
// It adds one thing to every test: a picture of the final screen, kept as evidence in the
// report whether the test passed or failed. (Videos are switched on in playwright.config.ts.)
import { test as base, expect } from '@playwright/test';

export const test = base.extend<{ finalScreen: void }>({
  finalScreen: [async ({ page }, use, testInfo) => {
    await use();
    if (testInfo.status === 'skipped') return;
    // A small JPEG at normal screen size (not the phone's high-resolution pixels) keeps the report light
    const shot = await page.screenshot({ type: 'jpeg', quality: 70, scale: 'css', timeout: 5000 }).catch(() => null);
    if (shot) await testInfo.attach('final screen', { body: shot, contentType: 'image/jpeg' });
  }, { auto: true }],
});

export { expect };
