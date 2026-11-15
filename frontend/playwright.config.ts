import { defineConfig, devices } from '@playwright/test';

/**
 * E2E (ECOSYSTEM.md 12.4): chạy frontend thật (vite dev, VITE_AUTH_DISABLED=true), API giả lập bằng page.route
 * (e2e/mockApi.ts) nên không cần backend/Keycloak/Postgres. Lệnh: `npm run e2e` (lần đầu: `npx playwright install chromium`).
 */
export default defineConfig({
  testDir: './e2e',
  testMatch: '**/*.e2e.ts',
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 1 : 0,
  reporter: process.env.CI ? [['list'], ['html', { open: 'never' }]] : 'list',
  use: {
    baseURL: 'http://127.0.0.1:5182',
    trace: 'retain-on-failure',
    locale: 'vi-VN',
  },
  projects: [{ name: 'chromium', use: { ...devices['Desktop Chrome'] } }],
  webServer: {
    command: 'npx vite --port 5182 --strictPort',
    url: 'http://127.0.0.1:5182',
    reuseExistingServer: false, // cổng 5182 riêng cho E2E KSVB (5181 là E2E HRM, 5174 là dev server KSVB)
    env: { VITE_AUTH_DISABLED: 'true' },
    timeout: 120_000,
  },
});
