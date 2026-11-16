import { vi } from 'vitest';
import { demoReply, resetDemoData } from '../design/demoBackend';
import type { Me, Person, SignRequestDetail, SignRequestSummary } from '../shared/api/types';

export interface Call {
  method: string;
  path: string;
  query: URLSearchParams;
  body: unknown;
  headers: Record<string, string>;
}

type Reply = unknown | { __status: number; body?: unknown };
type Route = (call: Call) => Reply;

/** Phản hồi lỗi RFC 7807 cho `routes`. */
export const fail = (status: number, code: string, detail: string, errors?: { field: string; message: string }[]): Reply => ({
  __status: status,
  body: { status, detail, code, errors },
});

/**
 * Thay `fetch` bằng backend giả cho test giao diện: `routes` đè từng lời gọi theo khoá "METHOD /đường-dẫn" (không gồm
 * /api và query; `:id` khớp một đoạn); lời gọi không có trong `routes` trả dữ liệu mẫu của src/design/demoBackend.ts
 * (dùng chung với bản preview và E2E).
 */
export function installFetch(routes: Record<string, Route> = {}) {
  const calls: Call[] = [];
  resetDemoData();
  const fn = vi.fn(async (input: RequestInfo | URL, init: RequestInit = {}) => {
    const u = new URL(String(input), 'http://localhost');
    const path = u.pathname.replace(/^\/api/, '');
    const method = (init.method ?? 'GET').toUpperCase();
    let body: unknown;
    if (typeof init.body === 'string') body = JSON.parse(init.body);
    else if (init.body instanceof FormData) body = init.body;
    const call: Call = { method, path, query: u.searchParams, body, headers: (init.headers ?? {}) as Record<string, string> };
    calls.push(call);

    const key = `${method} ${path}`;
    const route: Route | undefined = key in routes ? routes[key] : Object.entries(routes).find(([k]) => matches(k, key))?.[1];
    let reply: Reply;
    if (route) reply = route(call);
    else {
      const demo = demoReply(method, path, undefined, u.searchParams, body);
      reply = { __status: demo.status, body: demo.body };
    }
    const r = reply as { __status?: number; body?: unknown };
    const status = r && typeof r === 'object' && '__status' in r ? r.__status! : 200;
    const payload = r && typeof r === 'object' && '__status' in r ? r.body : reply;
    return new Response(payload === undefined ? null : JSON.stringify(payload), {
      status: payload === undefined && status === 200 ? 204 : status,
      headers: { 'Content-Type': 'application/json' },
    });
  });
  vi.stubGlobal('fetch', fn);
  return { calls, fn };
}

/** Route có tham số: "POST /sign-requests/:id/sign". */
function matches(pattern: string, actual: string): boolean {
  if (!pattern.includes(':')) return false;
  const re = new RegExp('^' + pattern.replace(/:[^/]+/g, '[^/]+') + '$');
  return re.test(actual);
}

const person = (id: number, name: string, extra: Partial<Person> = {}): Person => ({
  id,
  fullName: name,
  email: `u${id}@congty.vn`,
  unitName: 'Phòng Kinh doanh',
  jobTitle: 'Chuyên viên',
  active: true,
  ...extra,
});

export const ME: Me = {
  id: 4,
  fullName: 'Phạm Minh Tuấn',
  email: 'tuan.pm@congty.vn',
  employeeCode: 'NV000004',
  unitName: 'Phòng Kinh doanh',
  jobTitle: 'Chuyên viên',
  permissions: ['document.create', 'document.sign'],
};

export const PEOPLE: Person[] = [
  person(1, 'Nguyễn Văn An'),
  person(2, 'Trần Thị Bích', { unitName: 'Ban Tổng giám đốc' }),
  person(3, 'Lê Quang Cường', { unitName: 'Ban Tổng giám đốc' }),
  person(4, 'Phạm Minh Tuấn'),
];

export const summary = (id: number, title: string, extra: Partial<SignRequestSummary> = {}): SignRequestSummary => ({
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

export const detail = (id: number, title: string, extra: Partial<SignRequestDetail> = {}): SignRequestDetail => ({
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
      status: 'PENDING',
    },
    {
      userId: 3,
      fullName: 'Lê Quang Cường',
      jobTitle: 'Tổng giám đốc',
      unitName: 'Ban Tổng giám đốc',
      orderNo: 2,
      status: 'WAITING',
    },
  ],
  watchers: [],
  attachments: [{ id: 9, name: 'hop-dong.pdf', sizeBytes: 2048, signable: true, uploadedAt: '2026-10-30T09:00:00' }],
  canSign: true,
  canCancel: false,
  canRecall: false,
  canDelete: false,
  canEdit: false,
  versionNo: 1,
  ...extra,
});

/** Các route dùng chung cho hầu hết trang. */
export const baseRoutes = (me: Me = ME): Record<string, Route> => ({
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
