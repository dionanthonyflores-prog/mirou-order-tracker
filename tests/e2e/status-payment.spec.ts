// Moving orders along, payment, the driver's message, editing and cancelling.
import { test, expect } from './fixtures';
import { openApp, createOrder, choose, card, stat, advance } from './helpers';

const orderStatus = (page: import('@playwright/test').Page) => page.locator('#order-status');

test.describe('Status', { tag: '@T-REQ-02' }, () => {
  test('TT-08 a delivery order goes New → Preparing → Out for delivery → Done, then leaves the to-do list', async ({ page }) => {
    await openApp(page);
    const mika = card(page, 106);
    await expect(mika.locator('.status')).toHaveText('New');
    await advance(page, 'Start preparing', 'Preparing', mika);
    await expect(mika.locator('.status')).toHaveText('Preparing');
    await advance(page, 'Send out for delivery', 'Out for delivery', mika);
    await expect(mika.locator('.status')).toHaveText('Out for delivery');
    await advance(page, 'Mark done', 'Done', mika);
    await expect(page.locator('#open-orders [data-order="106"]')).toHaveCount(0);
    await expect(page.locator('#finished-orders [data-order="106"]')).toHaveCount(1);
    await expect(stat(page, 'open')).toHaveText('2');
    await expect(stat(page, 'sales')).toHaveText('₱2,015');   // finishing an order doesn't change the sales
  });

  test('TT-09 a pick up order is "Ready for pickup" instead of "Out for delivery"', async ({ page }) => {
    await openApp(page);
    const kim = card(page, 105);
    await expect(kim.locator('.status')).toHaveText('Preparing');
    await advance(page, 'Ready for pickup', 'Ready for pickup', kim);
    await expect(kim.locator('.status')).toHaveText('Ready for pickup');
  });

  test('TT-10 a quick double tap moves an order only one step', async ({ page }) => {
    await openApp(page);
    await card(page, 106).getByRole('button', { name: 'Start preparing' }).dblclick();
    await expect(page.getByRole('status')).toHaveText('Order #106: Preparing');
    await page.waitForTimeout(800);
    await expect(card(page, 106).locator('.status')).toHaveText('Preparing');
  });

  test('TT-11 cancelling asks first; a cancelled order leaves the to-do list and the sales', async ({ page }) => {
    await openApp(page);
    await card(page, 106).getByRole('link').click();
    await page.getByRole('button', { name: 'Cancel order' }).click();
    await page.getByRole('button', { name: 'Keep the order' }).click();       // changed her mind
    await expect(orderStatus(page)).toHaveText('New');
    await page.getByRole('button', { name: 'Cancel order' }).click();
    await page.getByRole('button', { name: 'Yes, cancel it' }).click();
    await expect(page.getByRole('status')).toHaveText('Order #106 cancelled');
    await expect(page.locator('#open-orders [data-order="106"]')).toHaveCount(0);
    await expect(stat(page, 'sales')).toHaveText('₱1,185');    // 2,015 − 830
    await expect(stat(page, 'unpaid')).toHaveText('₱660');     // 1,570 − 910
    await expect(page.locator('#finished-orders [data-order="106"] .status')).toHaveText('Cancelled');
  });
});

test.describe('Payment', { tag: '@T-REQ-02' }, () => {
  test('TT-12 an order can be marked paid by cash, GCash or bank transfer, and back to not paid', async ({ page }) => {
    await openApp(page);
    await card(page, 104).getByRole('link').click();
    await expect(page.locator('#payment-state')).toContainText('Not paid yet · ₱660 to collect');
    await page.getByRole('button', { name: 'GCash', exact: true }).click();
    await expect(page.locator('#payment-state')).toHaveText('Paid by GCash');
    await expect(page.locator('#driver-message')).toContainText('Paid already by GCash: nothing to collect');
    await page.getByRole('button', { name: 'Mark as not paid' }).click();
    await page.getByRole('button', { name: 'Bank transfer' }).click();
    await expect(page.locator('#payment-state')).toHaveText('Paid by Bank transfer');
    await page.getByRole('link', { name: '← Today' }).click();
    await expect(stat(page, 'unpaid')).toHaveText('₱910');     // only #106 left to collect
  });
});

test.describe('Driver', { tag: '@T-REQ-03' }, () => {
  test("TT-13 \"Copy for driver\" copies the address, the drinks and exactly what to collect", async ({ page, browserName, context }) => {
    await openApp(page);
    await card(page, 104).getByRole('link').click();
    const expected = [
      'mirou matcha · order #104', 'For: Paolo M.', 'Contact: 0900 000 0001', 'Address: 12 Sample St., Bay',
      '• 2× Matcha latte (16 oz, oatmilk)', '• 1× Hor-jicha (12 oz)', 'Collect: ₱660 (drinks ₱610 + delivery ₱50)', 'Notes: Gate is blue',
    ].join('\n');
    await expect(page.locator('#driver-message')).toHaveText(expected);
    if (browserName === 'chromium') {
      await context.grantPermissions(['clipboard-read', 'clipboard-write']);
      await page.getByRole('button', { name: 'Copy for driver' }).click();
      await expect(page.getByRole('status')).toHaveText("Copied. Paste it in the driver's chat.");
      expect((await page.evaluate(() => navigator.clipboard.readText())).replace(/\r\n/g, '\n')).toBe(expected);
    } else {
      // WebKit in tests has no clipboard permission: the message is selected so she can copy it by hand
      await page.getByRole('button', { name: 'Copy for driver' }).click();
      await expect(page.getByRole('status')).toHaveText(/Copied|copy it/);
    }
  });

  test('TT-14 pick up orders have no driver section', async ({ page }) => {
    await openApp(page);
    await card(page, 105).getByRole('link').click();
    await expect(page.getByRole('heading', { name: 'Order #105' })).toBeVisible();
    await expect(page.getByRole('button', { name: 'Copy for driver' })).toHaveCount(0);
  });
});

test.describe('Edit', { tag: '@T-REQ-01' }, () => {
  test('TT-15 editing an order updates its total, and switching to pick up turns "Out for delivery" into "Ready for pickup"', async ({ page }) => {
    await openApp(page);
    await card(page, 104).getByRole('link').click();
    await page.getByRole('link', { name: 'Edit order' }).click();
    await expect(page.getByRole('heading', { name: 'Edit order #104' })).toBeVisible();
    await page.getByRole('button', { name: 'Remove 1× Hor-jicha (12 oz)' }).click();
    await choose(page, 'Pick up or delivery', /Pick up/);
    await expect(page.locator('#form-total')).toHaveText('₱410');   // no delivery fee for pick up
    await page.getByRole('button', { name: 'Save changes' }).click();
    await expect(page.getByRole('status')).toHaveText('Changes to order #104 saved');
    await expect(orderStatus(page)).toHaveText('Ready for pickup');
    await expect(page.locator('#order-total')).toHaveText('₱410');
    await expect(page.getByRole('button', { name: 'Copy for driver' })).toHaveCount(0);
  });

  test('TT-16 a price is kept as it was when the order was made', async ({ page }) => {
    // An order saved yesterday at an older price (₱150 for a Matcha latte) keeps that price when it is edited
    await page.clock.setFixedTime(new Date('2026-10-06T07:00:00Z'));
    await page.addInitScript(() => {
      if (localStorage.getItem('mirou-tracker-demo')) return;
      localStorage.setItem('mirou-tracker-demo', JSON.stringify([{
        id: 'old-1', no: 201, createdAt: '2026-10-06T01:00:00Z', customer: 'Old price', contact: '', how: 'pickup', address: '',
        deliveryFee: 0, notes: '', status: 'new', paid: false, paidBy: null,
        items: [{ drink: 'Matcha latte', size: '12oz', oat: false, qty: 2, unitPrice: 150 }],
      }]));
    });
    await page.goto('./#/order/old-1/edit');
    await expect(page.locator('#form-total')).toHaveText('₱300');
    await page.getByLabel('Name').fill('Old price, edited');
    await page.getByRole('button', { name: 'Save changes' }).click();
    await expect(page.locator('#order-total')).toHaveText('₱300');
  });
});
