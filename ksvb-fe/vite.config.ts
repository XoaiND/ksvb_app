/// <reference types="vitest" />
import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig({
  plugins: [react()],
  server: {
    host: '127.0.0.1',
    port: 5174, // 5173 = HRM frontend dev; strictPort: bận thì báo lỗi, không tự nhảy sang cổng của app khác
    strictPort: true,
    allowedHosts: ['.ts.net'],
    proxy: { '/api': 'http://127.0.0.1:8082' },
  },
  test: {
    environment: 'jsdom',
    globals: true,
    env: { VITE_AUTH_DISABLED: 'true' }, // test không qua Keycloak
    setupFiles: ['./src/test/setup.ts'],
  },
});
