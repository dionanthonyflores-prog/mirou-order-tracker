// Today screen and new orders. Each test name starts with its test-case ID (TT-xx) and is tagged with its requirement.
import { test, expect } from './fixtures';
import { openApp, createOrder, addDrink, choose, card, stat } from './helpers';

test.describe('Today', { tag: '@T-REQ-04' }, () => {
  test("TT-01 Today shows the open orders, oldest first, and today's numbers in Manila time", async ({ page }) => {
    await openApp(page);
    await expect(page.locator('#demo-banner')).toContainText('Demo: made-up orders');
    // Sales count drinks only (not delivery fees) for today's orders that aren't cancelled: 375 + 610 + 200 + 830
    await expect(stat(page, 'sales')).toHaveText('₱2,015');
    // Still to collect, delivery fees included: 660 + 910
    await expect(stat(page, 'unpaid')).toHaveText('₱1,570');
    await expect(stat(page, 'cups')).toHaveText('10');
    await expect(stat(page, 'open')).toHaveText('3');
    await expect(page.locator('#open-orders > li')).toHaveCount(3);
    await expect(page.locator('#open-orders .no')).toHaveText(['#104', '#105', '#106']);
    // Yesterday's orders (#101, #102) are not on Today; this morning's finished order (#103) is tucked away
    await expect(page.locator('#finished-orders .no')).toHaveText(['#103']);
  });

  test('TT-02 an empty shop shows ₱0 and a friendly empty list', async ({ page }) => {
    await openApp(page, { empty: true });
    await expect(page.getByText('No open orders. Enjoy the quiet ✿')).toBeVisible();
    for (const id of ['sales', 'unpaid'] as const) await expect(stat(page, id)).toHaveText('₱0');
    await expect(stat(page, 'cups')).toHaveText('0');
  });
});

test.describe('New order', { tag: '@T-REQ-01' }, () => {
  test('TT-03 a delivery order with the upsize and oatmilk is priced right, joins repeat drinks, and shows up on Today', async ({ page }) => {
    await openApp(page);
    await createOrder(page, {
      customer: 'Rina P.', contact: '0900 000 0009', how: 'delivery', address: '5 Test St., Bay', fee: 50,
      drinks: [
        ['Matcha latte', { size: '16 oz', oat: true, qty: 2 }],   // 2 × (160 + 35 + 10) = 410
        ['Matcha latte', { size: '16 oz', oat: true, qty: 1 }],   // the same drink, size and milk join one line
        ['Hor-jicha', { size: '12 oz', qty: 1 }],                 // 200
      ],
    });
    await expect(page.getByRole('status')).toHaveText('Order #107 saved');
    const order = card(page, 107);
    await expect(order.locator('.items')).toHaveText('3× Matcha latte (16 oz, oatmilk)1× Hor-jicha (12 oz)');
    await expect(order).toContainText('₱865');        // 615 + 200 + ₱50 delivery
    await expect(order).toContainText('Unpaid');
    await expect(page.locator('#open-orders .no').last()).toHaveText('#107');   // newest goes to the end of the queue
    await expect(stat(page, 'sales')).toHaveText('₱2,830');
    await expect(stat(page, 'unpaid')).toHaveText('₱2,435');
    await expect(stat(page, 'cups')).toHaveText('14');
    await expect(stat(page, 'open')).toHaveText('4');
  });

  test('TT-04 an order without a name, a drink or a delivery address is not saved, and says what is missing', async ({ page }) => {
    await openApp(page);
    await page.getByRole('link', { name: '+ New order' }).click();
    await choose(page, 'Pick up or delivery', /Delivery/);
    await page.getByRole('button', { name: 'Save order' }).click();
    await expect(page.locator('#problems li')).toHaveText(["Add the customer's name.", 'Add at least one drink.', 'Add the delivery address.']);
    await expect(page.getByRole('heading', { name: 'New order' })).toBeVisible();   // still on the form
    await page.getByLabel('Name').fill('Leo C.');
    await addDrink(page, 'Hojicha latte');
    await choose(page, 'Pick up or delivery', /Pick up/);   // pick up needs no address
    await page.getByRole('button', { name: 'Save order' }).click();
    await expect(page.getByRole('status')).toHaveText('Order #107 saved');
  });

  test('TT-05 the price on "Add" and the total follow every choice; a line can be removed', async ({ page }) => {
    await openApp(page);
    await page.getByRole('link', { name: '+ New order' }).click();
    const add = page.getByRole('button', { name: /^Add · / });
    await page.getByRole('combobox', { name: /^Drink/ }).selectOption('Earl Grey latte');
    await expect(add).toHaveText('Add · ₱200');
    await choose(page, 'Size', /^16 oz/);
    await expect(add).toHaveText('Add · ₱235');
    await choose(page, 'Milk', /^Oatmilk/);
    await expect(add).toHaveText('Add · ₱245');
    const qty = page.getByRole('textbox', { name: 'How many cups' });
    await qty.fill('');
    await qty.pressSequentially('3x');                       // letters are ignored
    await expect(qty).toHaveValue('3');
    await expect(add).toHaveText('Add · ₱735');
    await add.click();
    await addDrink(page, 'Hojicha latte', { qty: 2 });       // 2 × 150
    await expect(page.locator('#form-total')).toHaveText('₱1,035');
    await page.getByRole('button', { name: 'Remove 3× Earl Grey latte (16 oz, oatmilk)' }).click();
    await expect(page.locator('#form-total')).toHaveText('₱300');
    await expect(page.locator('#form-lines li')).toHaveCount(1);
  });

  test('TT-06 security: script-like text typed as a name is shown as plain text, never run', { tag: '@T-REQ-08' }, async ({ page }) => {
    const errors: string[] = [];
    page.on('pageerror', e => errors.push(e.message));
    page.on('dialog', d => { errors.push(`a dialog opened: ${d.message()}`); d.dismiss(); });
    await openApp(page);
    const nasty = '<img src=x onerror="alert(1)"><b>Rina</b>';
    await createOrder(page, { customer: nasty, notes: '<script>alert(2)</script>', drinks: [['Matcha latte']] });
    await expect(card(page, 107).locator('.customer')).toHaveText(nasty);
    await card(page, 107).getByRole('link').click();
    await expect(page.locator('#order-customer')).toHaveText(nasty);
    await expect(page.getByText('<script>alert(2)</script>')).toBeVisible();
    expect(await page.locator('main img, main b, main script').count()).toBe(0);
    expect(errors).toEqual([]);
  });

  test('TT-07 orders are still there after closing and reopening the app', { tag: '@T-REQ-01' }, async ({ page }) => {
    await openApp(page);
    await createOrder(page, { customer: 'Nico V.', paidBy: 'Cash', drinks: [['Seasalt Hojicha', { qty: 2 }]] });
    await page.reload();
    await expect(card(page, 107)).toContainText('Nico V.');
    await expect(card(page, 107)).toContainText('Paid');
    await expect(stat(page, 'open')).toHaveText('4');
  });
});
