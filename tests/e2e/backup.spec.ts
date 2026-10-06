// Backup: downloading every order as a spreadsheet file, and the weekly reminder.
import { test, expect } from './fixtures';
import { openApp, NOW } from './helpers';
import fs from 'node:fs';

test.describe('Backup', { tag: '@T-REQ-11' }, () => {
  test('TT-21 "Download all orders" gives a spreadsheet file with every order, and records the backup', async ({ page }) => {
    await openApp(page);
    const download = page.waitForEvent('download');
    await page.getByRole('button', { name: 'Download all orders (spreadsheet)' }).click();
    const file = await download;
    expect(file.suggestedFilename()).toBe('mirou-orders-2026-10-06.csv');
    const csv = fs.readFileSync(await file.path(), 'utf8');
    const lines = csv.replace(/^﻿/, '').trimEnd().split('\r\n');
    expect(lines[0]).toBe('Order,Date,Time,Customer,Contact,Pick up or delivery,Address,Drinks,Cups,Drinks total,Delivery fee,Total,Status,Paid,Paid by,Notes');
    expect(lines.map(l => l.split(',')[0]).slice(1)).toEqual(['101', '102', '103', '104', '105', '106']);   // all 6 sample orders, yesterday's too
    expect(lines[4]).toContain('Paolo M.');
    await expect(page.getByRole('status')).toHaveText('Downloaded 6 orders. Save the file in your Google Drive.');
    await expect(page.locator('#backup-state')).toContainText('Last backup: today.');
    await expect(page.locator('#backup-reminder')).toHaveCount(0);
  });

  test('TT-22 a reminder shows when there has never been a backup, or the last one is 7 or more days old', async ({ page }) => {
    await openApp(page);
    await expect(page.locator('#backup-reminder')).toHaveText(/No backup yet\./);
    // A backup 6 days ago: no reminder yet
    await page.evaluate(t => localStorage.setItem('mirou-tracker-last-backup-demo', t), new Date(NOW.getTime() - 6 * 86_400_000).toISOString());
    await page.reload();
    await expect(page.locator('#backup-reminder')).toHaveCount(0);
    await expect(page.locator('#backup-state')).toContainText('Last backup: 6 days ago.');
    // 7 days ago: time for a new one
    await page.evaluate(t => localStorage.setItem('mirou-tracker-last-backup-demo', t), new Date(NOW.getTime() - 7 * 86_400_000).toISOString());
    await page.reload();
    await expect(page.locator('#backup-reminder')).toHaveText(/Your last backup was 7 days ago\./);
  });

  test('TT-23 an empty shop has nothing to back up, so there is no reminder', async ({ page }) => {
    await openApp(page, { empty: true });
    await expect(page.locator('#backup-reminder')).toHaveCount(0);
  });
});
