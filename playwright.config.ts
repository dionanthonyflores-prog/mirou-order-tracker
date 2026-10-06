// Playwright settings: which devices to test on, and how to start the tracker for testing.
import { defineConfig, devices } from '@playwright/test';

const onGitHub = !!process.env.CI;   // GitHub Actions sets CI=true
// Test another copy instead, e.g. the published demo:  BASE_URL=https://.../ npx playwright test
const baseURL = process.env.BASE_URL ?? 'http://localhost:5176/';

export default defineConfig({
  testDir: './tests/e2e',
  timeout: 60_000,
  fullyParallel: true,
  forbidOnly: onGitHub,
  retries: onGitHub ? 1 : 0,
  reporter: onGitHub
    ? [['list'], ['github'], ['html', { open: 'never' }]]
    : [['list'], ['html', { open: 'never' }]],
  use: {
    baseURL,
    // Evidence in the report: every test gets a video and a picture of its final screen (see tests/e2e/fixtures.ts)
    video: 'on',
    trace: 'retain-on-failure',
    screenshot: 'only-on-failure',
  },

  // She uses it on her phone, so the phones come first; the laptop check makes sure it still works on a big screen
  projects: [
    { name: 'android-phone', use: { ...devices['Pixel 7'] } },
    // WebKit is slower to drive (about 1s per click on Windows), so iPhone tests get more time
    { name: 'iphone', use: { ...devices['iPhone 15'] }, timeout: 120_000 },
    { name: 'desktop-chrome', use: { ...devices['Desktop Chrome'] } },
  ],

  webServer: process.env.BASE_URL ? undefined : {
    command: 'node scripts/serve.cjs',
    url: 'http://localhost:5176',
    reuseExistingServer: !onGitHub,
  },
});
