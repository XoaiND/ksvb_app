import { render, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter } from 'react-router';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { baseRoutes, detail, fail, installFetch, ME, PEOPLE, summary, type Call } from '../test/fakeBackend';
import App from './App';
import AppProviders from './AppProviders';

function renderAt(path: string) {
  return render(
    <MemoryRouter initialEntries={[path]}>
      <AppProviders>
        <App />
      </AppProviders>
    </MemoryRouter>,
  );
}

const dashboard = {
  pendingForMe: 1,
  inProgress: 3,
  completed: 5,
  rejectedOrCancelled: 1,
  mine: 4,
  shared: 2,
  expired: 0,
  year: 2026,
  completedByMonth: [0, 1, 2, 0, 0, 0, 0, 0, 0, 3, 0, 0],
  todo: [summary(5, 'Tờ trình ngân sách quý IV', { canSign: true })],
};

afterEach(() => vi.unstubAllGlobals());

describe('Dashboard và menu', () => {
  it('hiện số liệu và việc cần xử lý từ API', async () => {
    installFetch({ ...baseRoutes(), 'GET /dashboard': () => dashboard });
    renderAt('/dashboard');
    expect(await screen.findByText('Việc cần xử lý ngay')).toBeInTheDocument();
    expect(screen.getByText('Tờ trình ngân sách quý IV')).toBeInTheDocument();
    expect(screen.getAllByText(ME.fullName).length).toBeGreaterThan(0);
  });

  it('menu ẩn/hiện theo quyền (client role)', async () => {
    installFetch({ ...baseRoutes(), 'GET /dashboard': () => dashboard });
    renderAt('/dashboard');
    await screen.findByText('Việc cần xử lý ngay');
    const nav = screen.getByRole('navigation', { name: 'Menu chính' });
    expect(within(nav).getByText('Soạn tài liệu mới')).toBeInTheDocument();
    expect(within(nav).queryByText('Báo cáo')).not.toBeInTheDocument();
    expect(within(nav).queryByText('Quản trị')).not.toBeInTheDocument();
  });

  it('quản trị thấy Báo cáo và Quản trị', async () => {
    const admin = { ...ME, permissions: ['document.create', 'document.sign', 'report.view', 'user.manage', 'audit.view'] };
    installFetch({ ...baseRoutes(admin), 'GET /dashboard': () => dashboard });
    renderAt('/dashboard');
    await screen.findByText('Việc cần xử lý ngay');
    const nav = screen.getByRole('navigation', { name: 'Menu chính' });
    expect(within(nav).getByText('Báo cáo')).toBeInTheDocument();
    expect(within(nav).getByText('Quản trị')).toBeInTheDocument();
  });

  it('người chưa có role nào không thấy menu soạn thảo', async () => {
    installFetch({ ...baseRoutes({ ...ME, permissions: [] }), 'GET /dashboard': () => dashboard });
    renderAt('/dashboard');
    await screen.findByText('Việc cần xử lý ngay');
    const nav = screen.getByRole('navigation', { name: 'Menu chính' });
    expect(within(nav).queryByText('Soạn tài liệu mới')).not.toBeInTheDocument();
    expect(screen.getByText('Chưa được cấp quyền ký')).toBeInTheDocument();
  });

  it('lỗi tải /me hiện màn thông báo', async () => {
    installFetch({ ...baseRoutes(), 'GET /me': () => fail(403, 'FORBIDDEN', 'Tài khoản chưa được cấp quyền trong hệ thống') });
    renderAt('/dashboard');
    expect(await screen.findByText('Không vào được hệ thống')).toBeInTheDocument();
    expect(screen.getByText('Tài khoản chưa được cấp quyền trong hệ thống')).toBeInTheDocument();
  });

  it('thu gọn menu và đổi giao diện tối', async () => {
    installFetch({ ...baseRoutes(), 'GET /dashboard': () => dashboard });
    renderAt('/profile');
    await screen.findByText('Giao diện hiển thị');
    await userEvent.click(screen.getByRole('button', { name: 'Thu gọn / mở rộng menu' }));
    expect(document.querySelector('.ant-layout-sider')).toHaveClass('ant-layout-sider-collapsed');
    await userEvent.click(screen.getByText('Tối'));
    expect(document.documentElement.getAttribute('data-theme')).toBe('dark');
  });
});

describe('Danh sách tài liệu', () => {
  it('đổi tab thì gọi API với scope tương ứng', async () => {
    const { calls } = installFetch(baseRoutes());
    renderAt('/documents?tab=1');
    expect(await screen.findByText('Tờ trình ngân sách quý IV')).toBeInTheDocument();
    await userEvent.click(screen.getByRole('tab', { name: /Tài liệu cá nhân/ }));
    expect(await screen.findByText('Báo giá XYZ')).toBeInTheDocument();
    const scopes = calls
      .filter((c) => c.path === '/sign-requests' && c.query.get('size') === '10')
      .map((c) => c.query.get('scope'));
    expect(scopes).toContain('pending');
    expect(scopes).toContain('mine');
  });

  it('tìm kiếm gửi từ khoá lên máy chủ', async () => {
    const { calls } = installFetch(baseRoutes());
    renderAt('/documents?tab=2');
    await screen.findByText('Báo giá XYZ');
    await userEvent.type(screen.getByLabelText('Tìm tiêu đề, mã hiệu'), 'XYZ');
    await userEvent.click(screen.getByRole('button', { name: /Tìm kiếm/ }));
    await waitFor(() => expect(calls.some((c) => c.query.get('q') === 'XYZ')).toBe(true));
  });

  it('huỷ văn bản bắt buộc nhập lý do rồi gọi API', async () => {
    const mine = summary(8, 'Hợp đồng đang chờ', { creator: PEOPLE[3] });
    const { calls } = installFetch({
      ...baseRoutes(),
      'GET /sign-requests': () => ({ content: [mine], page: 0, size: 10, totalElements: 1, totalPages: 1 }),
      'POST /sign-requests/:id/cancel': () => detail(8, 'Hợp đồng đang chờ', { status: 'CANCELLED' }),
    });
    renderAt('/documents?tab=2');
    await screen.findByText('Hợp đồng đang chờ');
    await userEvent.click(screen.getByRole('button', { name: 'Huỷ' }));
    await userEvent.click(screen.getByRole('button', { name: 'Huỷ tài liệu' }));
    expect(await screen.findByText('Cần nhập lý do huỷ')).toBeInTheDocument();
    await userEvent.type(screen.getByLabelText(/Lý do huỷ/), 'Nộp nhầm');
    await userEvent.click(screen.getByRole('button', { name: 'Huỷ tài liệu' }));
    await waitFor(() => expect(calls.find((c) => c.path === '/sign-requests/8/cancel')?.body).toEqual({ note: 'Nộp nhầm' }));
  });
});

describe('Ký và từ chối', () => {
  const signRoutes = (calls?: Call[]) => ({
    ...baseRoutes(),
    'GET /sign-requests/:id': () => detail(5, 'Tờ trình ngân sách quý IV'),
    'POST /sign-requests/:id/sign': () => detail(5, 'Tờ trình ngân sách quý IV', { canSign: false }),
    'POST /sign-requests/:id/reject': () => detail(5, 'Tờ trình ngân sách quý IV', { status: 'REJECTED', canSign: false }),
    ...(calls ? {} : {}),
  });

  it('ký: cần xác nhận đã đọc, rồi gọi API ký kèm ghi chú', async () => {
    const { calls } = installFetch(signRoutes());
    renderAt('/documents/5/sign');
    await screen.findByText(/Ký: Tờ trình/);
    await userEvent.click(screen.getByRole('button', { name: /Ký văn bản/ }));
    await userEvent.click(screen.getByRole('button', { name: /Xác nhận ký/ }));
    expect(await screen.findByText('Cần xác nhận đã đọc văn bản')).toBeInTheDocument();
    await userEvent.type(screen.getByLabelText(/Ghi chú/), 'đồng ý');
    await userEvent.click(screen.getByLabelText(/Tôi đã đọc/));
    await userEvent.click(screen.getByRole('button', { name: /Xác nhận ký/ }));
    await waitFor(() =>
      expect(calls.find((c) => c.method === 'POST' && c.path === '/sign-requests/5/sign')?.body).toEqual({ note: 'đồng ý' }),
    );
    expect(await screen.findByText('Đã ký văn bản thành công')).toBeInTheDocument();
  });

  it('từ chối bắt buộc có lý do', async () => {
    const { calls } = installFetch(signRoutes());
    renderAt('/documents/5/sign');
    await screen.findByText(/Ký: Tờ trình/);
    await userEvent.click(screen.getByRole('button', { name: /Từ chối/ }));
    await userEvent.click(screen.getByRole('button', { name: 'Gửi từ chối' }));
    expect(await screen.findByText('Cần nhập lý do từ chối')).toBeInTheDocument();
    expect(calls.some((c) => c.path.endsWith('/reject'))).toBe(false);
    await userEvent.type(screen.getByLabelText(/Lý do từ chối/), 'Thiếu phụ lục');
    await userEvent.click(screen.getByRole('button', { name: 'Gửi từ chối' }));
    await waitFor(() => expect(calls.find((c) => c.path === '/sign-requests/5/reject')?.body).toEqual({ note: 'Thiếu phụ lục' }));
  });

  it('lỗi từ backend (409 chưa đến lượt) hiện nguyên thông điệp', async () => {
    installFetch({
      ...signRoutes(),
      'POST /sign-requests/:id/sign': () =>
        fail(409, 'CONFLICT', 'Quy trình đang ở bước trước. Hệ thống sẽ thông báo khi đến lượt của bạn.'),
    });
    renderAt('/documents/5/sign');
    await screen.findByText(/Ký: Tờ trình/);
    await userEvent.click(screen.getByRole('button', { name: /Ký văn bản/ }));
    await userEvent.click(screen.getByLabelText(/Tôi đã đọc/));
    await userEvent.click(screen.getByRole('button', { name: /Xác nhận ký/ }));
    expect(await screen.findByText(/Quy trình đang ở bước trước/)).toBeInTheDocument();
  });

  it('người không đến lượt: nút ký bị khoá', async () => {
    installFetch({ ...signRoutes(), 'GET /sign-requests/:id': () => detail(5, 'Tờ trình ngân sách quý IV', { canSign: false }) });
    renderAt('/documents/5/sign');
    await screen.findByText(/Ký: Tờ trình/);
    expect(screen.getByRole('button', { name: /Ký văn bản/ })).toBeDisabled();
  });
});

describe('Soạn tài liệu', () => {
  it('thiếu tệp PDF thì không sang bước 2', async () => {
    installFetch(baseRoutes());
    renderAt('/compose');
    await screen.findByText('Soạn tài liệu mới', { selector: 'h2' });
    await userEvent.type(screen.getByLabelText(/Tiêu đề/), 'Hợp đồng thử');
    await userEvent.click(screen.getByRole('button', { name: 'Tiếp theo →' }));
    expect(await screen.findByText('Cần nhập tiêu đề và chọn ít nhất 1 tệp PDF cần ký')).toBeInTheDocument();
  });

  it('từ chối tệp không phải PDF cho ô tệp cần ký', async () => {
    installFetch(baseRoutes());
    renderAt('/compose');
    await screen.findByText('Soạn tài liệu mới', { selector: 'h2' });
    const input = screen.getByTestId('file-input') as HTMLInputElement;
    await userEvent.upload(input, new File(['x'], 'bang.xlsx'), { applyAccept: false });
    expect(await screen.findByText('Tệp cần ký phải là PDF')).toBeInTheDocument();
  });

  it('luồng đầy đủ: lưu nháp → tải PDF → trình ký, đúng thứ tự gọi API', async () => {
    const { calls } = installFetch({
      ...baseRoutes(),
      'POST /sign-requests': () => detail(30, 'Hợp đồng thử', { status: 'DRAFT', attachments: [], canSign: false }),
      'POST /sign-requests/:id/attachments': () => ({
        id: 51,
        name: 'hd.pdf',
        sizeBytes: 5,
        signable: true,
        uploadedAt: '2026-10-31T10:00:00',
      }),
      'POST /sign-requests/:id/submit': () => detail(30, 'Hợp đồng thử'),
      'GET /sign-requests/:id': () => detail(30, 'Hợp đồng thử'),
    });
    renderAt('/compose');
    await screen.findByText('Soạn tài liệu mới', { selector: 'h2' });

    await userEvent.type(screen.getByLabelText(/Tiêu đề/), 'Hợp đồng thử');
    await userEvent.upload(screen.getByTestId('file-input'), new File(['%PDF-1.4'], 'hd.pdf', { type: 'application/pdf' }));
    await userEvent.click(screen.getByRole('button', { name: 'Tiếp theo →' }));

    // bước 2: chưa có người ký thì báo lỗi
    await userEvent.click(screen.getByRole('button', { name: 'Tiếp theo →' }));
    expect(await screen.findByText('Cần ít nhất một người ký.')).toBeInTheDocument();

    await userEvent.click(screen.getByRole('button', { name: /Thêm người ký/ }));
    await userEvent.click(await screen.findByLabelText(/Nguyễn Văn An/));
    await userEvent.click(screen.getByRole('button', { name: 'Thêm đã chọn' }));
    await userEvent.click(screen.getByRole('button', { name: 'Tiếp theo →' }));

    await userEvent.click(await screen.findByRole('button', { name: /Trình ký$/ }));
    const dialog = await screen.findByRole('dialog');
    await userEvent.click(within(dialog).getByRole('button', { name: /Trình ký/ }));

    await waitFor(() => expect(calls.some((c) => c.path === '/sign-requests/30/submit')).toBe(true));
    const order = calls.filter((c) => c.method === 'POST').map((c) => c.path);
    expect(order.indexOf('/sign-requests')).toBeLessThan(order.indexOf('/sign-requests/30/attachments'));
    expect(order.indexOf('/sign-requests/30/attachments')).toBeLessThan(order.indexOf('/sign-requests/30/submit'));
    const created = calls.find((c) => c.method === 'POST' && c.path === '/sign-requests')!.body as {
      signerIds: number[];
      title: string;
    };
    expect(created.signerIds).toEqual([1]);
    expect(created.title).toBe('Hợp đồng thử');
  });

  it('không có quyền document.create thì báo thiếu quyền', async () => {
    installFetch(baseRoutes({ ...ME, permissions: ['document.sign'] }));
    renderAt('/compose');
    expect(await screen.findByText(/chưa được cấp quyền soạn/)).toBeInTheDocument();
  });
});

describe('Báo cáo và quản trị', () => {
  it('báo cáo hiển thị số liệu từ API', async () => {
    const lead = { ...ME, permissions: ['report.view'] };
    installFetch({
      ...baseRoutes(lead),
      'GET /reports/summary': () => ({
        total: 141,
        completed: 100,
        overdue: 4,
        onTimeRate: 92.5,
        avgSignHours: 43.2,
        byUnit: { 'Phòng Kinh doanh': 42 },
        slowestSigners: [{ fullName: 'Lê Quang Cường', avgWaitHours: 62.4, overdue: 2 }],
      }),
    });
    renderAt('/reports');
    expect(await screen.findByText('141')).toBeInTheDocument();
    expect(screen.getByText('92,5%')).toBeInTheDocument();
    expect(screen.getByText('Lê Quang Cường')).toBeInTheDocument();
  });

  it('trang quản trị: chỉ hiện tab đúng quyền', async () => {
    installFetch({
      ...baseRoutes({ ...ME, permissions: ['audit.view'] }),
      'GET /admin/audit-logs': () => ({ content: [], page: 0, size: 20, totalElements: 0, totalPages: 0 }),
    });
    renderAt('/admin');
    expect(await screen.findByRole('tab', { name: 'Nhật ký' })).toBeInTheDocument();
    expect(screen.queryByRole('tab', { name: 'Người dùng' })).not.toBeInTheDocument();
  });

  it('không có quyền quản trị thì báo không truy cập được', async () => {
    installFetch(baseRoutes());
    renderAt('/admin');
    expect(await screen.findByText('Bạn không có quyền truy cập trang Quản trị.')).toBeInTheDocument();
  });
});
