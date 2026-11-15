import react from '@vitejs/plugin-react';
import { defineConfig } from 'vite';
import { viteSingleFile } from 'vite-plugin-singlefile';

// Bản preview giao diện: `npm run build:design` → ../docs/design/index.html (một file, mở trực tiếp bằng trình duyệt).
export default defineConfig({
  root: 'design', // chạy từ thư mục frontend (npm run)
  base: './',
  plugins: [react(), viteSingleFile()],
  define: { 'import.meta.env.VITE_AUTH_DISABLED': JSON.stringify('true') },
  build: {
    outDir: '../../docs/design', // tính từ root
    emptyOutDir: true,
    chunkSizeWarningLimit: 5000,
  },
});
