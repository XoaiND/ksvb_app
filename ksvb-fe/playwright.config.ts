import { defineConfig, devices } from '@playwright/test';
import { fileURLToPath } from 'node:url';

/**
 * E2E luồng chính (ECOSYSTEM.md 12.4): chạy ksvb-be profile `h2` (dữ liệu mẫu, không Keycloak, người dùng theo
 * header X-User-Id) + ksvb-fe dev với VITE_AUTH_DISABLED=true. Cần JDK 25 (JAVA_HOME) và `npx playwright install chromium`.
 * Chạy: `npm run e2e`.
 */
const win = process.platform === 'win32';
const beDir = fileURLToPath(new URL('../ksvb-be/', import.meta.url));

export default defineConfig({
  testDir: './e2e',
  timeout: 60_000,
  retries: process.env.CI ? 1 : 0,
  workers: 1, // các kịch bản dùng chung một DB H2 trong bộ nhớ
  reporter: process.env.CI ? [['github'], ['html', { open: 'never' }]] : 'list',
  use: { baseURL: 'http://127.0.0.1:5174', trace: 'retain-on-failure', locale: 'vi-VN' },
  projects: [{ name: 'chromium', use: { ...devices['Desktop Chrome'], viewport: { width: 1366, height: 900 } } }],
  webServer: [
    {
      command: win ? `"${beDir}mvnw.cmd" -B -q spring-boot:run` : './mvnw -B -q spring-boot:run',
      cwd: beDir,
      url: 'http://127.0.0.1:8082/actuator/health',
      env: { SPRING_PROFILES_ACTIVE: 'h2', KSVB_STORAGE_PATH: './target/e2e-upload' },
      timeout: 240_000,
      reuseExistingServer: !process.env.CI,
    },
    {
      command: 'npm run dev',
      url: 'http://127.0.0.1:5174',
      env: { VITE_AUTH_DISABLED: 'true', VITE_DEV_USER_ID: '4' },
      timeout: 60_000,
      reuseExistingServer: !process.env.CI,
    },
  ],
});
