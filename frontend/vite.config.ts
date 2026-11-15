import { defineConfig } from 'vitest/config';
import react from '@vitejs/plugin-react';

export default defineConfig({
  plugins: [react()],
  build: {
    // Lõi Ant Design dùng chung mọi màn ~600 kB (gzip ~190 kB); các màn đã tách chunk lười trong app/App.tsx.
    chunkSizeWarningLimit: 700,
  },
  server: {
    port: 5174, // 5173 = HRM frontend dev; strictPort: bận thì báo lỗi, không tự nhảy sang cổng của app khác
    strictPort: true,
    // Mặc định chỉ nghe 127.0.0.1 (không dùng "localhost": Node mới phân giải thành ::1 nên `tailscale serve` vào 127.0.0.1 sẽ lỗi).
    // Xem trên thiết bị khác: `tailscale serve` (HTTPS, vẫn host mặc định) + VITE_ALLOWED_HOSTS=<tên MagicDNS>;
    // hoặc đặt VITE_HOST=<IP Tailscale của máy> để bind thẳng vào IP đó.
    host: process.env.VITE_HOST ?? '127.0.0.1',
    allowedHosts: ['.ts.net', ...(process.env.VITE_ALLOWED_HOSTS ? process.env.VITE_ALLOWED_HOSTS.split(',') : [])],
    // Gọi /api qua proxy để khỏi cấu hình CORS khi dev
    proxy: { '/api': { target: process.env.VITE_PROXY_TARGET ?? 'http://127.0.0.1:8082', changeOrigin: true } },
  },
  test: {
    environment: 'jsdom',
    globals: true,
    env: { VITE_AUTH_DISABLED: 'true' }, // test không qua Keycloak
    setupFiles: ['./src/test/setup.ts'],
    include: ['src/**/*.test.{ts,tsx}'], // e2e/ do Playwright chạy (npm run e2e)
  },
});
