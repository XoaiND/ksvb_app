/**
 * Backend giả trong bộ nhớ cho bản preview `docs/design/index.html` (npm run build:design): thay `fetch` để giao diện
 * thật chạy được khi mở file trực tiếp, không cần backend. Luật nghiệp vụ chỉ mô phỏng đủ để bấm thử; luật thật ở BE.
 */
import type {
  AuditEntry,
  DocStatus,
  Me,
  Participant,
  Person,
  SaveSignRequestInput,
  SignRequestDetail,
  SignRequestSummary,
  Template,
} from '../shared/api/types';
import { ROLE_PERMISSIONS } from '../shared/auth/permissions';

const p = (id: number, fullName: string, unitName: string, jobTitle: string, active = true): Person => ({
  id,
  fullName,
  unitName,
  jobTitle,
  email: `user${id}@congty.vn`,
  active,
});

const PEOPLE: Person[] = [
  p(1, 'Nguyễn Văn An', 'Phòng Kinh doanh', 'Trưởng phòng'),
  p(2, 'Trần Thị Bích', 'Ban Tổng giám đốc', 'Phó tổng giám đốc'),
  p(3, 'Lê Quang Cường', 'Ban Tổng giám đốc', 'Tổng giám đốc'),
  p(4, 'Phạm Minh Tuấn', 'Phòng Kinh doanh', 'Chuyên viên'),
  p(5, 'Hoàng Thu Hà', 'Phòng Pháp chế', 'Trưởng phòng'),
  p(6, 'Đỗ Hải Nam', 'Phòng Tài chính - Kế toán', 'Kế toán trưởng'),
  p(7, 'Vũ Thị Lan', 'Phòng Nhân sự', 'Trưởng phòng'),
  p(8, 'Bùi Đức Minh', 'Khối Công nghệ', 'Giám đốc khối'),
  p(9, 'Ngô Thanh Sơn', 'Phòng Hành chính', 'Chuyên viên'),
  p(10, 'Đặng Mai Phương', 'Phòng Marketing', 'Trưởng phòng', false),
];
const ME_ID = 4;
const person = (id: number) => PEOPLE.find((x) => x.id === id)!;
const now = () => new Date().toISOString().slice(0, 19);
const day = (offset: number) => new Date(Date.now() + offset * 86400000).toISOString().slice(0, 10);

let seq = 200;
let counter = 7;
const audit: AuditEntry[] = [];
const log = (action: string, target: string, detail?: string, result = 'OK') =>
  audit.unshift({ id: ++seq, at: now(), actor: person(ME_ID).fullName, action, target, detail, result });

function makeDoc(
  id: number,
  title: string,
  docType: string,
  creatorId: number,
  signers: [number, Participant['status']][],
  extra: Partial<SignRequestDetail> = {},
): SignRequestDetail {
  return {
    id,
    code: `HD-2026-00${id}`,
    title,
    docType,
    unitName: person(creatorId).unitName,
    creator: person(creatorId),
    priority: 'NORMAL',
    mode: 'SEQ',
    status: 'PENDING',
    shared: false,
    deadline: day(5),
    submittedAt: now(),
    participants: signers.map(([uid, status], i) => ({
      userId: uid,
      fullName: person(uid).fullName,
      jobTitle: person(uid).jobTitle,
      unitName: person(uid).unitName,
      orderNo: i + 1,
      status,
      signedAt: status === 'SIGNED' || status === 'REJECTED' ? now() : undefined,
    })),
    watchers: [],
    attachments: [{ id: id * 10, name: `${title}.pdf`, sizeBytes: 245760, signable: true, uploadedAt: now() }],
    canSign: false,
    canCancel: false,
    canRecall: false,
    canDelete: false,
    canEdit: false,
    versionNo: 1,
    ...extra,
  };
}

const DOCS: SignRequestDetail[] = [
  makeDoc(
    101,
    'Hợp đồng cung cấp dịch vụ ABC-01',
    'Hợp đồng',
    1,
    [
      [4, 'PENDING'],
      [2, 'WAITING'],
      [3, 'WAITING'],
    ],
    {
      priority: 'HIGH',
      message: 'Anh chị xem giúp mục 4 về điều khoản thanh toán.',
      watchers: [person(5)],
    },
  ),
  makeDoc(
    102,
    'Tờ trình ngân sách quý IV',
    'Tờ trình',
    6,
    [
      [4, 'PENDING'],
      [3, 'WAITING'],
    ],
    { priority: 'URGENT' },
  ),
  makeDoc(
    103,
    'Hợp đồng thuê văn phòng chi nhánh Miền Nam',
    'Hợp đồng',
    4,
    [
      [1, 'SIGNED'],
      [2, 'PENDING'],
      [3, 'PENDING'],
    ],
    {
      mode: 'PAR',
      shared: true,
    },
  ),
  makeDoc(
    104,
    'Báo giá gói bảo hiểm doanh nghiệp XYZ',
    'Báo giá',
    4,
    [
      [1, 'WAITING'],
      [3, 'WAITING'],
    ],
    {
      status: 'DRAFT',
      code: undefined,
      submittedAt: undefined,
    },
  ),
  makeDoc(
    105,
    'Quyết định bổ nhiệm trưởng phòng Marketing',
    'Quyết định',
    7,
    [
      [2, 'SIGNED'],
      [3, 'SIGNED'],
    ],
    {
      status: 'COMPLETED',
      completedAt: now(),
      shared: true,
      watchers: [person(4)],
    },
  ),
  makeDoc(
    106,
    'Biên bản họp giao ban tháng 10',
    'Biên bản',
    4,
    [
      [5, 'REJECTED'],
      [3, 'WAITING'],
    ],
    {
      status: 'REJECTED',
    },
  ),
];
DOCS[5].participants[0].note = 'Thiếu danh sách người tham dự, đề nghị bổ sung.';

const TEMPLATES: Template[] = [
  { id: 1, name: 'Hợp đồng thương mại', mode: 'SEQ', usedCount: 5, signers: [person(1), person(2), person(3)] },
  { id: 2, name: 'Biên bản họp', mode: 'PAR', usedCount: 2, signers: [person(5), person(7), person(9)] },
];

/** Tính lại các cờ canSign/canEdit... theo người xem (như BE). */
function view(d: SignRequestDetail): SignRequestDetail {
  const mine = d.creator.id === ME_ID;
  const anySigned = d.participants.some((x) => x.status === 'SIGNED');
  return {
    ...d,
    canSign: d.status === 'PENDING' && d.participants.some((x) => x.userId === ME_ID && x.status === 'PENDING'),
    canEdit: mine && d.status === 'DRAFT',
    canDelete: mine && d.status === 'DRAFT',
    canCancel: mine && d.status === 'PENDING' && !anySigned,
    canRecall: mine && d.status === 'PENDING' && !anySigned,
  };
}
const summary = (d: SignRequestDetail): SignRequestSummary => {
  const v = view(d);
  return {
    id: v.id,
    code: v.code,
    title: v.title,
    docType: v.docType,
    unitName: v.unitName,
    creator: v.creator,
    priority: v.priority,
    mode: v.mode,
    status: v.status,
    shared: v.shared,
    deadline: v.deadline,
    submittedAt: v.submittedAt,
    signedCount: v.participants.filter((x) => x.status === 'SIGNED').length,
    signerCount: v.participants.length,
    canSign: v.canSign,
  };
};
const page = <T>(all: T[], q: URLSearchParams) => {
  const pg = Number(q.get('page') ?? 0);
  const size = Number(q.get('size') ?? 10);
  return {
    content: all.slice(pg * size, pg * size + size),
    page: pg,
    size,
    totalElements: all.length,
    totalPages: Math.ceil(all.length / size),
  };
};

class Problem {
  constructor(
    readonly status: number,
    readonly code: string,
    readonly detail: string,
  ) {}
}
const find = (id: number) => {
  const d = DOCS.find((x) => x.id === id);
  if (!d) throw new Problem(404, 'NOT_FOUND', 'Không tìm thấy văn bản');
  return d;
};

function list(q: URLSearchParams) {
  const scope = q.get('scope') ?? 'pending';
  const kw = (q.get('q') ?? '').toLowerCase();
  const rows = DOCS.map(view).filter((d) => {
    if (scope === 'pending' && !d.canSign) return false;
    if (scope === 'mine' && d.creator.id !== ME_ID) return false;
    if (scope === 'shared' && !d.shared) return false;
    if (scope === 'watching' && !d.watchers.some((w) => w.id === ME_ID)) return false;
    if (kw && !`${d.title} ${d.code ?? ''}`.toLowerCase().includes(kw)) return false;
    if (q.get('docType') && d.docType !== q.get('docType')) return false;
    if (q.get('unit') && d.unitName !== q.get('unit')) return false;
    if (q.get('status') && d.status !== q.get('status')) return false;
    return true;
  });
  return page(rows.map(summary), q);
}

function save(d: SignRequestDetail | undefined, b: SaveSignRequestInput): SignRequestDetail {
  const base =
    d ??
    makeDoc(++seq, b.title ?? '', b.docType ?? '', ME_ID, [], {
      status: 'DRAFT',
      code: undefined,
      submittedAt: undefined,
      attachments: [],
    });
  Object.assign(base, {
    title: b.title,
    docType: b.docType,
    description: b.description,
    priority: b.priority ?? 'NORMAL',
    mode: b.mode ?? 'SEQ',
    deadline: b.deadline,
    message: b.message,
    shared: !!b.shared,
    watchers: (b.watcherIds ?? []).map(person),
    participants: (b.signerIds ?? []).map((uid, i) => ({
      userId: uid,
      fullName: person(uid).fullName,
      jobTitle: person(uid).jobTitle,
      unitName: person(uid).unitName,
      orderNo: i + 1,
      status: 'WAITING' as const,
    })),
  });
  if (!d) DOCS.unshift(base);
  log(d ? 'UPDATE' : 'CREATE', `SignRequest#${base.id}`, base.title);
  return view(base);
}

function setStatus(d: SignRequestDetail, s: DocStatus) {
  d.status = s;
  if (s === 'COMPLETED') d.completedAt = now();
}

function route(method: string, path: string, q: URLSearchParams, body: unknown, perms: string[]): unknown {
  const m = (re: RegExp) => path.match(re);
  let r: RegExpMatchArray | null;
  if (method === 'GET' && path === '/me') {
    const me: Me = { ...person(ME_ID), employeeCode: 'NV000004', permissions: perms };
    return me;
  }
  if (method === 'GET' && path === '/users') return PEOPLE.filter((x) => x.active);
  if (method === 'GET' && path === '/dashboard') {
    const all = DOCS.map(view);
    const by = (s: DocStatus) => all.filter((d) => d.status === s).length;
    return {
      pendingForMe: all.filter((d) => d.canSign).length,
      inProgress: by('PENDING'),
      completed: by('COMPLETED'),
      rejectedOrCancelled: by('REJECTED') + by('CANCELLED'),
      mine: all.filter((d) => d.creator.id === ME_ID).length,
      shared: all.filter((d) => d.shared).length,
      expired: by('EXPIRED'),
      year: Number(q.get('year') ?? new Date().getFullYear()),
      completedByMonth: [2, 4, 3, 6, 5, 7, 4, 8, 6, 9, by('COMPLETED'), 0],
      todo: all.filter((d) => d.canSign).map(summary),
    };
  }
  if (method === 'GET' && path === '/sign-requests') return list(q);
  if ((r = m(/^\/sign-requests\/(\d+)$/))) {
    const d = find(Number(r[1]));
    if (method === 'GET') return view(d);
    if (method === 'PUT') {
      const b = body as SaveSignRequestInput;
      if (b.versionNo !== d.versionNo) throw new Problem(409, 'CONFLICT', 'Văn bản đã bị người khác thay đổi, vui lòng tải lại');
      d.versionNo++;
      return save(d, b);
    }
    if (method === 'DELETE') {
      DOCS.splice(DOCS.indexOf(d), 1);
      log('DELETE', `SignRequest#${d.id}`, d.title);
      return undefined;
    }
  }
  if (method === 'POST' && path === '/sign-requests') return save(undefined, body as SaveSignRequestInput);
  if ((r = m(/^\/sign-requests\/(\d+)\/(submit|sign|reject|cancel|recall|remind)$/)) && method === 'POST') {
    const d = find(Number(r[1]));
    const note = (body as { note?: string } | undefined)?.note;
    switch (r[2]) {
      case 'submit':
        if (!d.participants.length) throw new Problem(422, 'BUSINESS_RULE', 'Cần ít nhất một người ký');
        if (!d.attachments.some((a) => a.signable)) throw new Problem(422, 'BUSINESS_RULE', 'Cần ít nhất một tệp PDF cần ký');
        d.code = d.code ?? `${'HD'}-2026-${String(++counter).padStart(4, '0')}`;
        d.submittedAt = now();
        setStatus(d, 'PENDING');
        d.participants.forEach((x, i) => (x.status = d.mode === 'PAR' || i === 0 ? 'PENDING' : 'WAITING'));
        break;
      case 'sign': {
        const me = d.participants.find((x) => x.userId === ME_ID && x.status === 'PENDING');
        if (!me) throw new Problem(409, 'CONFLICT', 'Quy trình đang ở bước trước. Hệ thống sẽ thông báo khi đến lượt của bạn.');
        Object.assign(me, { status: 'SIGNED', signedAt: now(), note });
        const nextP = d.participants.find((x) => x.status === 'WAITING');
        if (d.mode === 'SEQ' && nextP) nextP.status = 'PENDING';
        if (d.participants.every((x) => x.status === 'SIGNED')) setStatus(d, 'COMPLETED');
        break;
      }
      case 'reject': {
        const me = d.participants.find((x) => x.userId === ME_ID && x.status === 'PENDING');
        if (!me) throw new Problem(409, 'CONFLICT', 'Chưa đến lượt bạn');
        Object.assign(me, { status: 'REJECTED', signedAt: now(), note });
        setStatus(d, 'REJECTED');
        break;
      }
      case 'cancel':
        d.cancellationReason = note;
        setStatus(d, 'CANCELLED');
        break;
      case 'recall':
        setStatus(d, 'DRAFT');
        d.participants.forEach((x) => (x.status = 'WAITING'));
        break;
      case 'remind':
        break;
    }
    log(r[2].toUpperCase(), d.code ?? `SignRequest#${d.id}`, note ?? d.title);
    return r[2] === 'remind' ? undefined : view(d);
  }
  if ((r = m(/^\/sign-requests\/(\d+)\/attachments$/)) && method === 'POST') {
    const d = find(Number(r[1]));
    const f = (body as FormData).get('file') as File;
    const a = { id: ++seq, name: f.name, sizeBytes: f.size, signable: q.get('signable') !== 'false', uploadedAt: now() };
    d.attachments.push(a);
    return a;
  }
  if ((r = m(/^\/sign-requests\/(\d+)\/attachments\/(\d+)$/))) {
    const d = find(Number(r[1]));
    if (method === 'DELETE') {
      d.attachments = d.attachments.filter((a) => a.id !== Number(r![2]));
      return undefined;
    }
    throw new Problem(404, 'NOT_FOUND', 'Bản preview không có nội dung tệp thật');
  }
  if (method === 'GET' && path === '/templates') return TEMPLATES;
  if (method === 'POST' && path === '/templates') {
    const b = body as { name: string; mode: Template['mode']; signerIds: number[] };
    const t: Template = { id: ++seq, name: b.name, mode: b.mode, usedCount: 0, signers: b.signerIds.map(person) };
    TEMPLATES.push(t);
    return t;
  }
  if ((r = m(/^\/templates\/(\d+)(\/use)?$/))) {
    const i = TEMPLATES.findIndex((t) => t.id === Number(r![1]));
    if (method === 'DELETE') {
      TEMPLATES.splice(i, 1);
      return undefined;
    }
    TEMPLATES[i].usedCount++;
    return TEMPLATES[i];
  }
  const need = (perm: string) => {
    if (!perms.includes(perm)) {
      log('BLOCKED', `${method} /api${path}`, 'FORBIDDEN: Thiếu quyền', 'ERROR');
      throw new Problem(403, 'FORBIDDEN', 'Bạn không có quyền thực hiện thao tác này.');
    }
  };
  if (method === 'GET' && path === '/reports/summary') {
    need('report.view');
    return {
      total: 141,
      completed: 112,
      overdue: 4,
      onTimeRate: 92.5,
      avgSignHours: 43.2,
      byUnit: { 'Phòng Kinh doanh': 42, 'Ban Tổng giám đốc': 31, 'Phòng Pháp chế': 18, 'Phòng Nhân sự': 12 },
      slowestSigners: [
        { fullName: 'Lê Quang Cường', avgWaitHours: 62.4, overdue: 2 },
        { fullName: 'Trần Thị Bích', avgWaitHours: 40.1, overdue: 1 },
      ],
    };
  }
  if (method === 'GET' && path === '/admin/users') {
    need('user.manage');
    return PEOPLE;
  }
  if ((r = m(/^\/admin\/users\/(\d+)$/)) && method === 'PATCH') {
    need('user.manage');
    const u = person(Number(r[1]));
    u.active = !!(body as { active?: boolean }).active;
    log('UPDATE_USER', `User#${u.id}`, `active=${u.active}`);
    return u;
  }
  if (method === 'GET' && path === '/admin/audit-logs') {
    need('audit.view');
    return page(audit, q);
  }
  throw new Problem(404, 'NOT_FOUND', `Bản preview chưa giả lập ${method} ${path}`);
}

const INITIAL = JSON.stringify({ people: PEOPLE, docs: DOCS, templates: TEMPLATES });

/** Đưa dữ liệu mẫu về ban đầu (bản preview khi mở trang, E2E trước mỗi kịch bản). */
export function resetDemoData() {
  const s = JSON.parse(INITIAL) as { people: Person[]; docs: SignRequestDetail[]; templates: Template[] };
  PEOPLE.splice(0, PEOPLE.length, ...s.people);
  DOCS.splice(0, DOCS.length, ...s.docs);
  TEMPLATES.splice(0, TEMPLATES.length, ...s.templates);
  audit.splice(0, audit.length);
  seq = 200;
  counter = 7;
  log('CREATE', 'SignRequest#106', 'Biên bản họp giao ban tháng 10');
}

export interface DemoReply {
  status: number;
  body?: unknown;
}

const ALL_PERMS = ROLE_PERMISSIONS['role.admin'];

/**
 * Trả lời một lời gọi /api (path không gồm tiền tố /api) như backend thật; lỗi theo RFC 7807 (`code`, `detail`).
 * Dùng chung cho bản preview (thay `window.fetch`), test giao diện (src/test/fakeFetch.ts) và E2E (e2e/mockApi.ts).
 * perms: quyền của người dùng giả (mặc định đủ quyền).
 */
export function demoReply(
  method: string,
  path: string,
  perms: string[] = ALL_PERMS,
  query: URLSearchParams = new URLSearchParams(),
  body?: unknown,
): DemoReply {
  try {
    const out = route(method.toUpperCase(), path, query, body, perms);
    return out === undefined ? { status: 204 } : { status: 200, body: out };
  } catch (e) {
    const pr = e instanceof Problem ? e : new Problem(500, 'INTERNAL_ERROR', 'Lỗi hệ thống, vui lòng thử lại sau');
    return { status: pr.status, body: { status: pr.status, code: pr.code, detail: pr.detail } };
  }
}

/** Thay `window.fetch` cho mọi lời gọi `/api/...` (bản preview). */
export function installDemoBackend(perms: string[] = ALL_PERMS) {
  resetDemoData();
  window.fetch = async (input: RequestInfo | URL, init: RequestInit = {}) => {
    const u = new URL(String(input), window.location.href.startsWith('http') ? window.location.href : 'http://preview.local/');
    const path = u.pathname.replace(/^.*\/api/, '');
    const body = typeof init.body === 'string' ? JSON.parse(init.body) : init.body;
    await new Promise((res) => setTimeout(res, 150));
    const r = demoReply(init.method ?? 'GET', path, perms, u.searchParams, body);
    return r.body === undefined ? new Response(null, { status: r.status }) : Response.json(r.body, { status: r.status });
  };
}
