import { defineConfig } from 'vitest/config';
import react from '@vitejs/plugin-react';

export default defineConfig({
  plugins: [react()],
  build: {
    // Lõi Ant Design dùng chung mọi màn ~600 kB (gzip ~190 kB); các màn đã tách chunk lười trong app/App.tsx.
    chunkSizeWarningLimit: 700,
  },
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
