import { defineConfig, devices } from '@playwright/test'

if (process.env.CI && (!process.env.PLAYWRIGHT_BASE_URL || !process.env.PLAYWRIGHT_API_BASE || !process.env.RELEASE_ID)) {
  throw new Error('CI smoke tests require PLAYWRIGHT_BASE_URL, PLAYWRIGHT_API_BASE and RELEASE_ID')
}

export default defineConfig({
  testDir: './tests/smoke',
  timeout: 45_000,
  expect: { timeout: 10_000 },
  fullyParallel: false,
  workers: 1,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 1 : 0,
  reporter: [['line'], ['html', { open: 'never' }]],
  use: {
    baseURL: process.env.PLAYWRIGHT_BASE_URL || 'http://127.0.0.1:3000',
    navigationTimeout: 20_000,
    actionTimeout: 10_000,
    trace: 'retain-on-failure',
    screenshot: 'only-on-failure',
  },
  projects: [{ name: 'chromium', use: { ...devices['Desktop Chrome'] } }],
})
