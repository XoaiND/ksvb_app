import { expect, test } from '@playwright/test';
import { pathToFileURL } from 'node:url';
import { fileURLToPath } from 'node:url';

/** Bản preview docs/design/index.html (npm run build:design) mở trực tiếp bằng file:// vẫn chạy được (backend giả). */
const file = pathToFileURL(fileURLToPath(new URL('../../docs/design/index.html', import.meta.url))).href;

test('Preview giao diện mở từ file, đi được các màn chính', async ({ page }) => {
  const errors: string[] = [];
  page.on('pageerror', (e) => errors.push(e.message));
  await page.goto(`${file}#/dashboard`);
  await expect(page.getByText('Việc cần xử lý ngay')).toBeVisible();
  await page.goto(`${file}#/documents?tab=2`);
  await expect(page.getByRole('row', { name: /Báo giá gói bảo hiểm/ })).toBeVisible();
  await page.goto(`${file}#/documents/101/sign`);
  await expect(page.getByRole('button', { name: /Ký văn bản/ })).toBeVisible();
  expect(errors).toEqual([]);
});
