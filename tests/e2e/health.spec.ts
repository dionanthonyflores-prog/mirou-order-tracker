// Page health and basics that apply to every screen.
import { test, expect } from './fixtures';
import { openApp, card } from './helpers';

const SCREENS = ['#/today', '#/new', '#/order/demo-104', '#/order/demo-104/edit'];

test('TT-17 every screen loads with no errors or missing files, and nothing sticks out sideways on a phone', async ({ page }) => {
  const problems: string[] = [];
  page.on('pageerror', e => problems.push(`script error: ${e.message}`));
  page.on('console', m => { if (m.type() === 'error') problems.push(`console error: ${m.text()}`); });
  page.on('response', r => { if (r.status() >= 400) problems.push(`${r.status()} ${r.url()}`); });
  await openApp(page);
  for (const screen of SCREENS) {
    await page.goto('./?demo' + screen);
    await expect(page.locator('main h1')).toBeVisible();
    const { wide, screenWidth } = await page.evaluate(() => ({ wide: document.documentElement.scrollWidth, screenWidth: innerWidth }));
    expect(wide, `${screen} should not scroll sideways`).toBeLessThanOrEqual(screenWidth);
  }
  expect(problems).toEqual([]);
});

test('TT-18 accessibility basics: every box and button has a name, and buttons are big enough to tap', async ({ page, isMobile }) => {
  await openApp(page);
  for (const screen of SCREENS) {
    await page.goto('./?demo' + screen);
    await expect(page.locator('main h1')).toBeVisible();
    const unnamed = await page.evaluate(() => [...document.querySelectorAll('main input:not([type=radio]), main select, main textarea, main button')]
      .filter(el => {
        const label = (el as HTMLInputElement).labels?.[0]?.textContent?.trim() || el.getAttribute('aria-label') || el.textContent?.trim();
        return !label;
      }).map(el => el.outerHTML.slice(0, 80)));
    expect(unnamed, `${screen}: controls without a name`).toEqual([]);
    if (isMobile) {
      const small = await page.evaluate(() => [...document.querySelectorAll('main button, main .btn, main .seg span, header .btn')]
        .filter(el => (el as HTMLElement).offsetParent !== null)
        .map(el => ({ text: el.textContent!.trim().slice(0, 30), h: Math.round(el.getBoundingClientRect().height) }))
        .filter(b => b.h < 36));
      expect(small, `${screen}: buttons under 36px tall`).toEqual([]);
    }
  }
});

test('TT-19 the tracker stays out of search engines', async ({ page }) => {
  await openApp(page);
  await expect(page.locator('meta[name="robots"]')).toHaveAttribute('content', 'noindex, nofollow');
});

test('TT-20 "Start over" brings the demo back to its sample orders', async ({ page }) => {
  await openApp(page);
  await card(page, 106).getByRole('button', { name: 'Start preparing' }).click();
  await expect(page.getByRole('status')).toHaveText('Order #106: Preparing');
  await page.getByRole('button', { name: 'Start over' }).click();
  await expect(page.getByRole('status')).toHaveText('The demo started over');
  await expect(card(page, 106).locator('.status')).toHaveText('New');
});
