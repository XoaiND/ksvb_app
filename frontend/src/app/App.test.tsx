import { fireEvent, render, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter } from 'react-router';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { resetDemoData } from '../design/demoBackend';
import { fail, installFetch as installBase, type Call, type Route } from '../test/fakeFetch';
import type { Me, Person, SignRequestDetail, SignRequestSummary } from '../shared/api/types';
import App from './App';
import AppProviders from './AppProviders';

type Reply = ReturnType<Route>;
type PlainRoute = (call: Call) => unknown;

const isReply = (r: unknown): r is Reply =>
  !!r &&
  typeof r === 'object' &&
  typeof (r as Reply).status === 'number' &&
  Object.keys(r).every((k) => k === 'status' || k === 'body');

/** Route trả dữ liệu thẳng (200), `{ status }` hoặc `fail(...)`; bọc lại thành Route của fakeFetch chuẩn. */
function installFetch(routes: Record<string, PlainRoute> = {}) {
  const wrapped: Record<string, Route> = {};
  for (const [k, h] of Object.entries(routes)) {
    wrapped[k] = (c) => {
      const r = h(c);
      if (r === undefined) return { status: 204 };
      return isReply(r) ? r : { status: 200, body: r };
    };
  }
  return installBase(wrapped);
}

beforeEach(() => resetDemoData());

// Dữ liệu mẫu riêng của test này (test/fakeFetch.ts không chứa dữ liệu nghiệp vụ).
const person = (id: number, name: string, extra: Partial<Person> = {}): Person => ({
  id,
  fullName: name,
  email: `u${id}@congty.vn`,
  unitName: 'Phòng Kinh doanh',
  jobTitle: 'Chuyên viên',
  active: true,
  hasSignature: true,
  ...extra,
});

const ME: Me = {
  id: 4,
  fullName: 'Phạm Minh Tuấn',
  email: 'tuan.pm@congty.vn',
  employeeCode: 'NV000004',
  unitName: 'Phòng Kinh doanh',
  jobTitle: 'Chuyên viên',
  permissions: ['document.create', 'document.sign'],
  hasSignature: true,
};

const PEOPLE: Person[] = [
  person(1, 'Nguyễn Văn An'),
  person(2, 'Trần Thị Bích', { unitName: 'Ban Tổng giám đốc' }),
  person(3, 'Lê Quang Cường', { unitName: 'Ban Tổng giám đốc' }),
  person(4, 'Phạm Minh Tuấn'),
];

const summary = (id: number, title: string, extra: Partial<SignRequestSummary> = {}): SignRequestSummary => ({
  id,
  code: `HD-2026-000${id}`,
  title,
  docType: 'Hợp đồng',
  unitName: 'Phòng Kinh doanh',
  creator: PEOPLE[0],
  priority: 'NORMAL',
  mode: 'SEQ',
  status: 'PENDING',
  shared: false,
  deadline: '2026-11-10',
  submittedAt: '2026-10-30T09:00:00',
  signedCount: 0,
  signerCount: 2,
  canSign: false,
  ...extra,
});

const detail = (id: number, title: string, extra: Partial<SignRequestDetail> = {}): SignRequestDetail => ({
  id,
  code: `HD-2026-000${id}`,
  title,
  docType: 'Hợp đồng',
  unitName: 'Phòng Kinh doanh',
  creator: PEOPLE[0],
  priority: 'NORMAL',
  mode: 'SEQ',
  status: 'PENDING',
  shared: false,
  deadline: '2026-11-10',
  submittedAt: '2026-10-30T09:00:00',
  participants: [
    {
      userId: 4,
      fullName: 'Phạm Minh Tuấn',
      jobTitle: 'Chuyên viên',
      unitName: 'Phòng Kinh doanh',
      orderNo: 1,
      stepNo: 1,
      status: 'PENDING',
    },
    {
      userId: 3,
      fullName: 'Lê Quang Cường',
      jobTitle: 'Tổng giám đốc',
      unitName: 'Ban Tổng giám đốc',
      orderNo: 2,
      stepNo: 2,
      status: 'WAITING',
    },
  ],
  watchers: [],
  attachments: [
    { id: 9, name: 'hop-dong.pdf', sizeBytes: 2048, signable: true, uploadedAt: '2026-10-30T09:00:00', signed: false },
  ],
  canSign: true,
  canCancel: false,
  canRecall: false,
  canDelete: false,
  canEdit: false,
  versionNo: 1,
  ...extra,
});

/** Các route dùng chung cho hầu hết trang. */
const baseRoutes = (me: Me = ME): Record<string, PlainRoute> => ({
  'GET /me': () => me,
  'GET /users': () => PEOPLE,
  'GET /templates': () => [],
  'GET /sign-requests': (c) => ({
    content:
      c.query.get('scope') === 'pending'
        ? [summary(5, 'Tờ trình ngân sách quý IV', { canSign: true })]
        : [summary(7, 'Báo giá XYZ', { status: 'DRAFT', creator: PEOPLE[3] })],
    page: 0,
    size: 10,
    totalElements: 1,
    totalPages: 1,
  }),
});

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
    const nav = screen.getByRole('menu');
    expect(within(nav).getByText('Soạn tài liệu mới')).toBeInTheDocument();
    expect(within(nav).queryByText('Báo cáo')).not.toBeInTheDocument();
    expect(within(nav).queryByText('Quản trị')).not.toBeInTheDocument();
  });

  it('quản trị thấy Báo cáo và Quản trị', async () => {
    const admin = { ...ME, permissions: ['document.create', 'document.sign', 'report.view', 'user.manage', 'audit.view'] };
    installFetch({ ...baseRoutes(admin), 'GET /dashboard': () => dashboard });
    renderAt('/dashboard');
    await screen.findByText('Việc cần xử lý ngay');
    const nav = screen.getByRole('menu');
    expect(within(nav).getByText('Báo cáo')).toBeInTheDocument();
    expect(within(nav).getByText('Quản trị')).toBeInTheDocument();
  });

  it('người chưa có role nào không thấy menu soạn thảo', async () => {
    installFetch({ ...baseRoutes({ ...ME, permissions: [] }), 'GET /dashboard': () => dashboard });
    renderAt('/dashboard');
    await screen.findByText('Việc cần xử lý ngay');
    const nav = screen.getByRole('menu');
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

describe('Đường dẫn lạ', () => {
  it('hiện trang Không tìm thấy', async () => {
    installFetch(baseRoutes());
    renderAt('/khong-co-trang-nay');
    expect(await screen.findByText('Không tìm thấy trang')).toBeInTheDocument();
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
  const signRoutes = () => ({
    ...baseRoutes(),
    'GET /sign-requests/:id': () => detail(5, 'Tờ trình ngân sách quý IV'),
    'POST /sign-requests/:id/sign': () => detail(5, 'Tờ trình ngân sách quý IV', { canSign: false }),
    'POST /sign-requests/:id/reject': () => detail(5, 'Tờ trình ngân sách quý IV', { status: 'REJECTED', canSign: false }),
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
      expect(calls.find((c) => c.method === 'POST' && c.path === '/sign-requests/5/sign')?.body).toEqual({
        note: 'đồng ý',
        showCaption: true,
      }),
    );
    expect(await screen.findByText('Đã ký. Chữ ký đã được đóng vào PDF.')).toBeInTheDocument();
  });

  it('ký: bỏ ghi họ tên/thời gian thì gửi showCaption=false', async () => {
    const { calls } = installFetch(signRoutes());
    renderAt('/documents/5/sign');
    await screen.findByText(/Ký: Tờ trình/);
    await userEvent.click(await screen.findByLabelText(/Ghi họ tên và thời gian/));
    await userEvent.click(screen.getByRole('button', { name: /Ký văn bản/ }));
    await userEvent.click(screen.getByLabelText(/Tôi đã đọc/));
    await userEvent.click(screen.getByRole('button', { name: /Xác nhận ký/ }));
    await waitFor(() =>
      expect(calls.find((c) => c.method === 'POST' && c.path === '/sign-requests/5/sign')?.body).toMatchObject({
        showCaption: false,
      }),
    );
  });

  it('văn bản đã ký xong: hiện thông tin bản đã ký và mã SHA-256', async () => {
    const sha = 'ab12cd34'.padEnd(56, '0') + 'ef567890';
    installFetch({
      ...baseRoutes(),
      'GET /sign-requests/:id': () =>
        detail(8, 'Quyết định đã ký', {
          status: 'COMPLETED',
          canSign: false,
          completedAt: '2026-11-02T10:00:00',
          participants: [
            { userId: 4, fullName: 'Phạm Minh Tuấn', orderNo: 1, stepNo: 1, status: 'SIGNED', signedAt: '2026-11-01T09:00:00' },
            { userId: 3, fullName: 'Lê Quang Cường', orderNo: 2, stepNo: 1, status: 'SIGNED', signedAt: '2026-11-02T10:00:00' },
          ],
          attachments: [
            {
              id: 9,
              name: 'qd.pdf',
              sizeBytes: 2048,
              signable: true,
              uploadedAt: '2026-10-30T09:00:00',
              signed: true,
              signedSizeBytes: 4096,
              signedSha256: sha,
              signedAt: '2026-11-02T10:00:00',
            },
          ],
        }),
    });
    renderAt('/documents/8');
    expect(await screen.findByText('Thông tin bản đã ký')).toBeInTheDocument();
    expect(screen.getByText('qd (đã ký).pdf')).toBeInTheDocument();
    expect(screen.getByText(/SHA-256 ab12cd34…ef567890/)).toBeInTheDocument();
    expect(screen.getByText('2/2 · 1 bước')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /Tải bản đã ký/ })).toBeInTheDocument();
  });

  it('chưa có ảnh chữ ký: báo và khoá nút ký', async () => {
    installFetch({ ...signRoutes(), 'GET /me': () => ({ ...ME, hasSignature: false }) });
    renderAt('/documents/5/sign');
    expect(await screen.findByText('Bạn chưa có ảnh chữ ký nên chưa ký được.')).toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'Tải ảnh chữ ký' })).toHaveAttribute('href', '/profile');
    expect(screen.getByRole('button', { name: /Ký văn bản/ })).toBeDisabled();
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
    await userEvent.click(screen.getByRole('button', { name: /Tiếp theo/ }));
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
      'PUT /sign-requests/:id': () => detail(30, 'Hợp đồng thử', { status: 'DRAFT', canSign: false }),
      'GET /sign-requests/:id/attachments/:aid/slots': () => ({
        pages: [{ width: 595, height: 842 }],
        slots: [{ orderNo: 1, page: 1, x: 72, y: 470, width: 170, height: 70 }], // ô có sẵn trong PDF
      }),
      'GET /sign-requests/:id/attachments/:aid/pages/:p': () => ({ imageDataUrl: 'data:image/png;base64,AA==' }),
    });
    renderAt('/compose');
    await screen.findByText('Soạn tài liệu mới', { selector: 'h2' });

    await userEvent.type(screen.getByLabelText(/Tiêu đề/), 'Hợp đồng thử');
    await userEvent.upload(screen.getByTestId('file-input'), new File(['%PDF-1.4'], 'hd.pdf', { type: 'application/pdf' }));
    await userEvent.click(screen.getByRole('button', { name: /Tiếp theo/ }));

    // bước 2: chưa có người ký thì báo lỗi
    await userEvent.click(screen.getByRole('button', { name: /Tiếp theo/ }));
    expect(await screen.findByText('Cần ít nhất một người ký.')).toBeInTheDocument();

    await userEvent.click(screen.getByRole('button', { name: /Thêm người ký/ }));
    await userEvent.click(await screen.findByLabelText(/Nguyễn Văn An/));
    await userEvent.click(screen.getByRole('button', { name: 'Thêm đã chọn' }));
    await userEvent.click(screen.getByRole('button', { name: /Tiếp theo/ }));

    // bước 3 Vị trí ký: lưu nháp + tải tệp trước, PDF mẫu có sẵn ô số 1 → đủ cho 1 người ký
    expect(await screen.findByText('Đủ ô cho 1 người ký.')).toBeInTheDocument();
    expect(calls.some((c) => c.method === 'GET' && c.path === '/sign-requests/30/attachments/51/slots')).toBe(true);
    await userEvent.click(screen.getByRole('button', { name: /Tiếp theo/ }));

    await userEvent.click(await screen.findByRole('button', { name: /Trình ký$/ }));
    const dialog = await screen.findByRole('dialog');
    await userEvent.click(within(dialog).getByRole('button', { name: /Trình ký/ }));

    await waitFor(() => expect(calls.some((c) => c.path === '/sign-requests/30/submit')).toBe(true));
    // không sửa ô → không ghi lại PDF
    expect(calls.some((c) => c.method === 'PUT' && c.path.endsWith('/slots'))).toBe(false);
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

  it('vị trí ký: ô thừa/thiếu chặn bước tiếp, sửa số ô rồi lưu vào PDF', async () => {
    const draft = detail(32, 'Nháp có PDF', {
      status: 'DRAFT',
      canEdit: true,
      canSign: false,
      attachments: [{ id: 61, name: 'hd.pdf', sizeBytes: 9, signable: true, uploadedAt: '2026-11-01T09:00:00', signed: false }],
      participants: [{ userId: 1, fullName: 'Nguyễn Văn An', orderNo: 1, stepNo: 1, status: 'WAITING' }],
    });
    const { calls } = installFetch({
      ...baseRoutes(),
      'GET /sign-requests/:id': () => draft,
      'PUT /sign-requests/:id': () => draft,
      'GET /sign-requests/:id/attachments/:aid/slots': () => ({
        pages: [{ width: 595, height: 842 }],
        slots: [{ orderNo: 4, page: 1, x: 100, y: 500, width: 150, height: 60 }],
      }),
      'PUT /sign-requests/:id/attachments/:aid/slots': (c) => ({
        pages: [{ width: 595, height: 842 }],
        slots: (c.body as { slots: unknown[] }).slots,
      }),
      'GET /sign-requests/:id/attachments/:aid/pages/:p': () => ({ imageDataUrl: 'data:image/png;base64,AA==' }),
    });
    renderAt('/compose?id=32');
    await screen.findByLabelText(/Tiêu đề/);
    await userEvent.click(screen.getByRole('button', { name: /Tiếp theo/ }));
    await userEvent.click(screen.getByRole('button', { name: /Tiếp theo/ }));

    expect(
      await screen.findByText(/Thiếu ô cho người ký số 1\. Có ô số 4 nhưng văn bản chỉ có 1 người ký\./),
    ).toBeInTheDocument();
    await userEvent.click(screen.getByRole('button', { name: /Tiếp theo/ }));
    expect(screen.getByText('Ô số 4 (trang 1)')).toBeInTheDocument(); // vẫn ở bước 3

    // chọn ô, đổi số thứ tự 4 → 1
    fireEvent.pointerDown(screen.getByRole('group', { name: /Ô ký 4/ }));
    const num = screen.getByLabelText('Số thứ tự');
    await userEvent.clear(num);
    await userEvent.type(num, '1');
    await userEvent.tab();
    expect(await screen.findByText('Đủ ô cho 1 người ký.')).toBeInTheDocument();

    await userEvent.click(screen.getByRole('button', { name: /Tiếp theo/ }));
    await screen.findByText('Xem lại thông tin');
    const put = calls.find((c) => c.method === 'PUT' && c.path === '/sign-requests/32/attachments/61/slots');
    expect(put?.body).toMatchObject({ slots: [{ orderNo: 1, page: 1, x: 100, y: 500, width: 150, height: 60 }] });
  });

  it('sửa bản nháp gửi lại versionNo (khoá lạc quan)', async () => {
    const draft = detail(31, 'Bản nháp cần sửa', { status: 'DRAFT', canEdit: true, canSign: false, versionNo: 3 });
    const { calls } = installFetch({
      ...baseRoutes(),
      'GET /sign-requests/:id': () => draft,
      'PUT /sign-requests/:id': () => ({ ...draft, versionNo: 4 }),
    });
    renderAt('/compose?id=31');
    const title = await screen.findByLabelText(/Tiêu đề/);
    expect(title).toHaveValue('Bản nháp cần sửa');
    await userEvent.type(title, ' (sửa)');
    await userEvent.click(screen.getByRole('button', { name: 'Lưu nháp' }));
    await waitFor(() => expect(calls.find((c) => c.method === 'PUT')?.body).toMatchObject({ versionNo: 3 }));
  });

  it('bước ký: gộp người vào bước trên thì gửi signerSteps; gộp hết thì thành song song', async () => {
    const three = [1, 2, 3].map((id, i) => ({
      userId: id,
      fullName: PEOPLE[id - 1].fullName,
      orderNo: i + 1,
      stepNo: i + 1,
      status: 'WAITING' as const,
    }));
    const draft = detail(33, 'Nháp theo bước', { status: 'DRAFT', canEdit: true, canSign: false, participants: three });
    const { calls } = installFetch({
      ...baseRoutes(),
      'GET /sign-requests/:id': () => draft,
      'PUT /sign-requests/:id': () => ({ ...draft, versionNo: 2 }),
    });
    renderAt('/compose?id=33');
    await screen.findByLabelText(/Tiêu đề/);
    await userEvent.click(screen.getByRole('button', { name: /Tiếp theo/ }));
    expect(await screen.findByTestId('step-3')).toBeInTheDocument();

    const joins = () => screen.getAllByRole('button', { name: /Ký cùng bước trên/ });
    await userEvent.click(joins()[0]); // người 2 ký cùng lúc với người 1
    expect(screen.queryByTestId('step-3')).not.toBeInTheDocument();
    expect(within(screen.getByTestId('step-1')).getByText(/2 người ký cùng lúc/)).toBeInTheDocument();
    await userEvent.click(screen.getByRole('button', { name: 'Lưu nháp' }));
    await waitFor(() =>
      expect(calls.find((c) => c.method === 'PUT')?.body).toMatchObject({ mode: 'SEQ', signerSteps: [1, 1, 2] }),
    );
  });

  it('bước ký: gộp hết vào một bước thì tự chuyển sang Song song', async () => {
    const two = [1, 2].map((id, i) => ({
      userId: id,
      fullName: PEOPLE[id - 1].fullName,
      orderNo: i + 1,
      stepNo: i + 1,
      status: 'WAITING' as const,
    }));
    const draft = detail(34, 'Nháp hai người', { status: 'DRAFT', canEdit: true, canSign: false, participants: two });
    const { calls } = installFetch({
      ...baseRoutes(),
      'GET /sign-requests/:id': () => draft,
      'PUT /sign-requests/:id': () => ({ ...draft, versionNo: 2 }),
    });
    renderAt('/compose?id=34');
    await screen.findByLabelText(/Tiêu đề/);
    await userEvent.click(screen.getByRole('button', { name: /Tiếp theo/ }));
    await userEvent.click(await screen.findByRole('button', { name: /Ký cùng bước trên/ }));
    expect(await screen.findByText('Mọi người đã cùng một bước nên chuyển thành ký Song song.')).toBeInTheDocument();
    expect(screen.getByText('Tất cả người ký nhận yêu cầu cùng lúc.')).toBeInTheDocument();
    await userEvent.click(screen.getByRole('button', { name: 'Lưu nháp' }));
    await waitFor(() => expect(calls.find((c) => c.method === 'PUT')?.body).toMatchObject({ mode: 'PAR' }));
    expect((calls.find((c) => c.method === 'PUT')?.body as { signerSteps?: number[] }).signerSteps).toBeUndefined();
  });

  it('không có quyền document.create thì hiện trang Không có quyền', async () => {
    installFetch({ ...baseRoutes({ ...ME, permissions: ['document.sign'] }), 'GET /dashboard': () => dashboard });
    renderAt('/compose');
    expect(await screen.findByText('Không có quyền truy cập')).toBeInTheDocument();
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
    expect(await screen.findByText('Không có quyền truy cập')).toBeInTheDocument();
  });
});

describe('Chữ ký của tôi', () => {
  const PNG = 'data:image/png;base64,iVBORw0KGgo=';

  beforeEach(() => {
    vi.stubGlobal('URL', Object.assign(URL, { createObjectURL: () => 'blob:goc', revokeObjectURL: () => undefined }));
  });

  it('tải ảnh → xem trước đã tách nền → lưu → hiện ảnh; rồi xoá', async () => {
    let saved = false;
    const { calls } = installFetch({
      ...baseRoutes(),
      'GET /me': () => ({ ...ME, hasSignature: saved, signatureUpdatedAt: saved ? '2026-11-22T08:00:00' : null }),
      'POST /me/signature/preview': () => ({ imageDataUrl: PNG, updatedAt: null }),
      'POST /me/signature': () => {
        saved = true;
        return { imageDataUrl: PNG, updatedAt: '2026-11-22T08:00:00' };
      },
      'GET /me/signature': () => ({ imageDataUrl: PNG, updatedAt: '2026-11-22T08:00:00' }),
      'DELETE /me/signature': () => {
        saved = false;
        return undefined;
      },
    });
    renderAt('/profile');
    expect(await screen.findByText('Chưa có chữ ký')).toBeInTheDocument();

    await userEvent.upload(screen.getByTestId('signature-input'), new File(['x'], 'chu-ky.png', { type: 'image/png' }));
    const dialog = await screen.findByRole('dialog');
    expect(await within(dialog).findByAltText('Chữ ký đã tách nền')).toHaveAttribute('src', PNG);
    expect(calls.some((c) => c.method === 'POST' && c.path === '/me/signature/preview')).toBe(true);
    expect(calls.some((c) => c.method === 'POST' && c.path === '/me/signature')).toBe(false);

    await userEvent.click(within(dialog).getByRole('button', { name: 'Lưu chữ ký' }));
    expect(await screen.findByAltText('Chữ ký của tôi')).toHaveAttribute('src', PNG);
    expect(screen.getByRole('button', { name: /Thay ảnh/ })).toBeInTheDocument();

    await userEvent.click(screen.getByRole('button', { name: /Xoá/ }));
    await screen.findByText('Xoá chữ ký?');
    await userEvent.click(screen.getAllByRole('button', { name: 'Xoá' }).slice(-1)[0]);
    expect(await screen.findByText('Chưa có chữ ký')).toBeInTheDocument();
    expect(calls.some((c) => c.method === 'DELETE' && c.path === '/me/signature')).toBe(true);
  });

  it('ảnh không có nét chữ ký: hiện lỗi từ máy chủ, không cho lưu', async () => {
    installFetch({
      ...baseRoutes(),
      'POST /me/signature/preview': () =>
        fail(422, 'BUSINESS_RULE', 'Không tìm thấy nét chữ ký trong ảnh. Hãy chụp lại rõ hơn, bút mực đậm trên giấy trắng.'),
    });
    renderAt('/profile');
    await userEvent.upload(await screen.findByTestId('signature-input'), new File(['x'], 'trang.jpg', { type: 'image/jpeg' }));
    expect(await screen.findByText(/Không tìm thấy nét chữ ký/)).toBeInTheDocument();
    expect(within(screen.getByRole('dialog')).getByRole('button', { name: 'Lưu chữ ký' })).toBeDisabled();
  });

  it('chặn tệp không phải PNG/JPG ngay ở trình duyệt', async () => {
    const { calls } = installFetch(baseRoutes());
    renderAt('/profile');
    await userEvent.upload(await screen.findByTestId('signature-input'), new File(['x'], 'a.gif', { type: 'image/gif' }), {
      applyAccept: false,
    });
    expect(await screen.findByText('Chỉ nhận ảnh PNG hoặc JPG')).toBeInTheDocument();
    expect(calls.some((c) => c.method === 'POST' && c.path.startsWith('/me/signature'))).toBe(false);
  });
});
