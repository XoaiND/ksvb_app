import { expect, test } from '@playwright/test';
import { mockApi } from './mockApi';

/** Luồng chính của KSVB trên giao diện thật, API giả lập (e2e/mockApi.ts). Người thao tác: Phạm Minh Tuấn (id 4). */

test.beforeEach(async ({ page }) => {
  await mockApi(page);
});

test('Dashboard hiện số liệu và việc cần ký', async ({ page }) => {
  await page.goto('/dashboard');
  await expect(page.getByRole('heading', { name: 'Dashboard' })).toBeVisible();
  await expect(page.getByText('Việc cần xử lý ngay')).toBeVisible();
  await expect(page.getByText('Tờ trình ngân sách quý IV').first()).toBeVisible();
});

test('soạn → tải PDF → chọn người ký → trình ký', async ({ page }) => {
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
});

test('ký văn bản: phải xác nhận đã đọc', async ({ page }) => {
  await page.goto('/documents/101/sign');
  await page.getByRole('button', { name: /Ký văn bản/ }).click();
  await page
    .getByRole('dialog')
    .getByRole('button', { name: /Xác nhận ký/ })
    .click();
  await expect(page.getByText('Cần xác nhận đã đọc văn bản')).toBeVisible();
  await page.getByLabel('Ghi chú (tuỳ chọn)').fill('Đồng ý (E2E)');
  await page.getByLabel(/Tôi đã đọc/).check();
  await page
    .getByRole('dialog')
    .getByRole('button', { name: /Xác nhận ký/ })
    .click();
  await expect(page.getByText('Đã ký văn bản thành công')).toBeVisible();
});

test('từ chối ký bắt buộc nhập lý do', async ({ page }) => {
  await page.goto('/documents?tab=1');
  const row = page.getByRole('row', { name: /Tờ trình ngân sách quý IV/ });
  await row.getByRole('button', { name: /Ký/ }).first().click();
  await page.getByRole('button', { name: /Từ chối/ }).click();
  await page.getByRole('button', { name: 'Gửi từ chối' }).click();
  await expect(page.getByText('Cần nhập lý do từ chối')).toBeVisible();
  await page.getByLabel('Lý do từ chối').fill('Thiếu phụ lục (E2E)');
  await page.getByRole('button', { name: 'Gửi từ chối' }).click();
  await expect(page.getByText('Đã từ chối ký')).toBeVisible();
});

test('Thiếu quyền: báo lỗi tiếng Việt, menu ẩn mục không được phép', async ({ page }) => {
  await mockApi(page, 'role.user');
  await page.goto('/reports');
  await expect(page.getByText('Bạn chưa được cấp quyền xem báo cáo (report.view).')).toBeVisible();
  const nav = page.getByRole('navigation', { name: 'Menu chính' });
  await expect(nav.getByText('Báo cáo')).toHaveCount(0);
  await expect(nav.getByText('Soạn tài liệu mới')).toBeVisible();
});
