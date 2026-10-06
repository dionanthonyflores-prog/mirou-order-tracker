import { expect, type Page } from '@playwright/test';

/** Every test runs at the same moment: Tuesday 6 Oct 2026, 3:00 pm in Manila */
export const NOW = new Date('2026-10-06T07:00:00Z');

/** Open the tracker with the demo's sample orders, or with no orders at all */
export async function openApp(page: Page, { empty = false } = {}) {
  await page.clock.setFixedTime(NOW);
  await page.goto(empty ? './?empty' : './');
  await expect(page.getByRole('heading', { name: 'Today', level: 1 })).toBeVisible();
}

/** Tap a choice that looks like a button (the real radio button is hidden behind its label) */
export async function choose(page: Page, group: string, option: string | RegExp) {
  const radio = page.getByRole('group', { name: group }).getByRole('radio', typeof option === 'string' ? { name: option, exact: true } : { name: option });
  await radio.locator('xpath=ancestor::label[1]').click();
  await expect(radio).toBeChecked();
}

type Pick = { size?: '12 oz' | '16 oz'; oat?: boolean; qty?: number };

/** In the New order form: pick a drink, its size, milk and quantity, then tap "Add" */
export async function addDrink(page: Page, drink: string, { size = '12 oz', oat = false, qty = 1 }: Pick = {}) {
  await page.getByRole('combobox', { name: /^Drink/ }).selectOption(drink);
  await choose(page, 'Size', new RegExp(`^${size}`));
  await choose(page, 'Milk', oat ? /^Oatmilk/ : 'Regular');
  const box = page.getByRole('textbox', { name: 'How many cups' });
  await box.fill(String(qty));
  await box.blur();
  await page.getByRole('button', { name: /^Add · / }).click();
}

type NewOrder = {
  customer: string; contact?: string; how?: 'pickup' | 'delivery'; address?: string; fee?: number; notes?: string;
  paidBy?: 'Cash' | 'GCash' | 'Bank transfer'; drinks: [string, Pick?][];
};

/** Fill in and save a whole new order */
export async function createOrder(page: Page, o: NewOrder) {
  await page.getByRole('link', { name: '+ New order' }).click();
  await expect(page.getByRole('heading', { name: 'New order' })).toBeVisible();
  for (const [drink, pick] of o.drinks) await addDrink(page, drink, pick);
  await page.getByLabel('Name').fill(o.customer);
  if (o.contact) await page.getByLabel(/^Contact number/).fill(o.contact);
  if (o.how === 'delivery') {
    await choose(page, 'Pick up or delivery', /Delivery/);
    await page.getByLabel('Address').fill(o.address ?? '');
    await page.getByLabel('Delivery fee (₱)').fill(String(o.fee ?? 0));
  }
  if (o.notes) await page.getByLabel(/^Notes/).fill(o.notes);
  if (o.paidBy) await choose(page, 'Paid?', o.paidBy);
  await page.getByRole('button', { name: 'Save order' }).click();
  await expect(page.getByRole('heading', { name: 'Today', level: 1 })).toBeVisible();
}

/** An order's card on the Today screen */
export const card = (page: Page, no: number) => page.locator(`[data-order="${no}"]`);

/** Tap the button that moves an order to its next step, and wait until it has moved.
 *  (Status buttons ignore taps for a moment after one is used, so a double tap can't skip a step.) */
export async function advance(page: Page, button: string, newStatus: string, scope = page.locator('main')) {
  await scope.getByRole('button', { name: button }).click();
  await expect(page.getByRole('status')).toContainText(newStatus);
  await page.waitForTimeout(750);
}

/** The numbers at the top of Today */
export const stat = (page: Page, id: 'sales' | 'unpaid' | 'cups' | 'open') => page.locator(`#stat-${id}`);
