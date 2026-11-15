import { expect, test, type Page } from '@playwright/test';

/** Đổi người đang thao tác (chế độ dev: backend lấy người dùng theo header X-User-Id). */
async function actAs(page: Page, userId: number) {
  await page.unroute('**/api/**');
  await page.route('**/api/**', (route) =>
    route.continue({ headers: { ...route.request().headers(), 'x-user-id': String(userId) } }),
  );
}

test('soạn → trình ký → người ký ký → hoàn thành', async ({ page }) => {
  await actAs(page, 4);
  await page.goto('/compose');
  const title = `Hợp đồng E2E ${Date.now()}`;
  await page.getByLabel('Tiêu đề').fill(title);
  await page.getByTestId('file-input').setInputFiles({
    name: 'hop-dong.pdf',
    mimeType: 'application/pdf',
    buffer: Buffer.from('%PDF-1.4 e2e'),
  });
  await page.getByRole('button', { name: 'Tiếp theo →' }).click();

  await page.getByRole('button', { name: /Thêm người ký/ }).click();
  await page.getByRole('dialog').getByText('Nguyễn Văn An').click();
  await page.getByRole('button', { name: 'Thêm đã chọn' }).click();
  await page.getByRole('button', { name: 'Tiếp theo →' }).click();

  await page.getByRole('button', { name: /Trình ký$/ }).click();
  await page
    .getByRole('dialog')
    .getByRole('button', { name: /Trình ký/ })
    .click();

  await expect(page).toHaveURL(/\/documents\/\d+$/);
  await expect(page.getByRole('heading', { level: 2, name: new RegExp(title) })).toBeVisible();
  await expect(page.getByText('Đang xử lý').first()).toBeVisible();
  const id = page.url().split('/').pop();

  // Người ký (id 1) vào màn ký
  await actAs(page, 1);
  await page.goto(`/documents/${id}/sign`);
  await page.getByRole('button', { name: /Ký văn bản/ }).click();
  await page.getByLabel('Ghi chú (tuỳ chọn)').fill('Đồng ý (E2E)');
  await page.getByLabel(/Tôi đã đọc/).check();
  await page
    .getByRole('dialog')
    .getByRole('button', { name: /Xác nhận ký/ })
    .click();
  await expect(page.getByText('Đã ký văn bản thành công')).toBeVisible();
  await expect(page.getByText('Hoàn thành').first()).toBeVisible();
});

test('từ chối ký bắt buộc nhập lý do', async ({ page }) => {
  await actAs(page, 4);
  await page.goto('/documents?tab=1');
  const row = page.getByRole('row', { name: /Tờ trình ngân sách quý IV/ });
  await row.getByRole('button', { name: /Ký/ }).first().click();

  await page.getByRole('button', { name: /Từ chối/ }).click();
  await page.getByRole('button', { name: 'Gửi từ chối' }).click();
  await expect(page.getByText('Cần nhập lý do từ chối')).toBeVisible();

  await page.getByLabel('Lý do từ chối').fill('Thiếu phụ lục (E2E)');
  await page.getByRole('button', { name: 'Gửi từ chối' }).click();
  await expect(page.getByText('Đã từ chối ký')).toBeVisible();
  await expect(page.getByText('Từ chối').first()).toBeVisible();
});
