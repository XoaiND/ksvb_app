import { defineConfig, devices } from '@playwright/test';

/**
 * E2E (docs/kien-truc-chuan.md mục 4): chạy frontend thật (vite dev, VITE_AUTH_DISABLED=true), API giả lập bằng
 * page.route (e2e/mockApi.ts, dữ liệu ở src/design/demoBackend.ts) nên không cần backend/Keycloak/Postgres.
 * Lệnh: `npm run e2e` (lần đầu: `npx playwright install chromium`). Cổng E2E = cổng dev + 8, mỗi app một cổng riêng.
 */
const port = 5174 + 8;

export default defineConfig({
  testDir: './e2e',
  testMatch: '**/*.e2e.ts',
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 1 : 0,
  reporter: process.env.CI ? [['list'], ['html', { open: 'never' }]] : 'list',
  use: {
    baseURL: `http://127.0.0.1:${port}`,
    trace: 'retain-on-failure',
    locale: 'vi-VN',
  },
  projects: [{ name: 'chromium', use: { ...devices['Desktop Chrome'] } }],
  webServer: {
    command: `npx vite --port ${port} --strictPort`,
    url: `http://127.0.0.1:${port}`,
    reuseExistingServer: false,
    env: { VITE_AUTH_DISABLED: 'true' },
    timeout: 120_000,
  },
});
