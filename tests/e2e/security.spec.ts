// Security of her real database, checked from the outside, the way a stranger would try it:
// someone who has the app's public address and key (they are in every copy of the app) but no login.
// These checks only ever get "no" answers back, so they never read or change any real order.
import { test, expect } from './fixtures';
import { SUPABASE_URL, SUPABASE_KEY } from '../../js/config.js';

const headers = { apikey: SUPABASE_KEY, 'Content-Type': 'application/json' };
const fakeOrder = { customer: 'Intruder', how: 'pickup', items: [{ drink: 'Matcha latte', size: '12oz', oat: false, qty: 1, unitPrice: 1 }] };

test.describe('Her real database, as a stranger', { tag: '@T-REQ-08' }, () => {
  test.beforeEach(async ({}, testInfo) => {
    test.skip(!SUPABASE_URL, 'No database connected (demo only)');
    test.skip(testInfo.project.name !== 'desktop-chrome', 'A database check, not a screen check: run it once');
  });

  test('TT-24 without logging in, nobody can read, add, change or delete orders, or create an account', async ({ request }) => {
    const orders = `${SUPABASE_URL}/rest/v1/orders`;
    const refused = async (what: string, response: import('@playwright/test').APIResponse) => {
      expect(response.status(), `${what} should be refused`).toBe(401);
      expect((await response.json()).message, what).toBe('permission denied for table orders');
    };
    await refused('reading orders', await request.get(`${orders}?select=*`, { headers }));
    await refused('adding an order', await request.post(orders, { headers, data: fakeOrder }));
    await refused('changing orders', await request.patch(`${orders}?customer=neq.x`, { headers, data: { paid: true, paid_by: 'cash' } }));
    await refused('deleting orders', await request.delete(`${orders}?customer=neq.x`, { headers }));

    const signUp = await request.post(`${SUPABASE_URL}/auth/v1/signup`, { headers, data: { email: 'intruder-test@example.com', password: 'NotARealPassword-123' } });
    expect(signUp.status(), 'creating an account should be refused').toBe(422);
    expect((await signUp.json()).error_code).toBe('signup_disabled');
  });

  test('TT-25 the keep-awake check answers "ok" and is the only thing a stranger can run', { tag: '@T-REQ-12' }, async ({ request }) => {
    const ping = await request.post(`${SUPABASE_URL}/rest/v1/rpc/ping`, { headers, data: {} });
    expect(ping.status()).toBe(200);
    expect(await ping.json()).toBe('ok');
  });
});

test.describe('Logging in', { tag: '@T-REQ-08' }, () => {
  test.beforeEach(() => test.skip(!SUPABASE_URL, 'No database connected (demo only)'));

  test('TT-26 the real app asks for a login first, and says so clearly when the password is wrong', async ({ page }) => {
    // The login request is answered by a stand-in, so the test never sends anything to her real login
    await page.route('**/auth/v1/token**', route => route.fulfill({
      status: 400, contentType: 'application/json',
      body: JSON.stringify({ code: 400, error_code: 'invalid_credentials', msg: 'Invalid login credentials' }),
    }));
    await page.goto('./');
    await expect(page.getByRole('heading', { name: 'Log in' })).toBeVisible();
    await expect(page.getByRole('link', { name: '+ New order' })).toBeHidden();
    await expect(page.locator('#demo-banner')).toBeHidden();
    await page.getByLabel('Email').fill('someone@example.com');
    await page.getByLabel('Password').fill('wrong-password');
    await page.getByRole('button', { name: 'Log in' }).click();
    await expect(page.locator('#login-problem')).toHaveText("That email and password don't match.");
    await expect(page.getByRole('heading', { name: 'Log in' })).toBeVisible();
    // The way into the demo for anyone else
    await page.getByRole('link', { name: 'Open the demo' }).click();
    await expect(page.getByRole('heading', { name: 'Today' })).toBeVisible();
  });
});
