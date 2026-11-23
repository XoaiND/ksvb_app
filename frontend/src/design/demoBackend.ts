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
  SignSlot,
  SlotLayout,
  Template,
} from '../shared/api/types';
import { ROLE_PERMISSIONS } from '../shared/auth/permissions';
import { DemoSignatureError, demoSignatureOf, removeBackground, SAMPLE_SIGNATURE } from './demoSignature';

const p = (id: number, fullName: string, unitName: string, jobTitle: string, active = true): Person => ({
  id,
  fullName,
  unitName,
  jobTitle,
  email: `user${id}@congty.vn`,
  active,
  hasSignature: !NO_SIGNATURE.includes(id),
});
/** Người dùng mẫu chưa tải ảnh chữ ký. */
const NO_SIGNATURE = [5, 9];

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
const person = (id: number): Person => {
  const x = PEOPLE.find((u) => u.id === id)!;
  return x.id === ME_ID ? { ...x, hasSignature: !!mySignature } : x;
};
/** Ảnh chữ ký của người dùng mẫu (null = chưa có). */
const signatureOf = (id: number): string | null =>
  id === ME_ID
    ? (mySignature?.imageDataUrl ?? null)
    : NO_SIGNATURE.includes(id)
      ? null
      : demoSignatureOf(person(id).fullName, id);
const now = () => new Date().toISOString().slice(0, 19);
const day = (offset: number) => new Date(Date.now() + offset * 86400000).toISOString().slice(0, 10);

let seq = 200;
/** Ô ký theo id tệp (backend thật đọc/ghi annotation trong PDF). Tệp chưa có thì dùng bố cục mặc định. */
const slotStore: Record<number, SlotLayout> = {};
const A4 = { width: 595.28, height: 841.89 };
/** Vị trí ô số k trên trang 2 của PDF mẫu (Bên A, Bên B, Người phê duyệt, rồi các hàng dưới). */
const slotAt = (k: number): SignSlot =>
  k === 1
    ? { orderNo: 1, page: 2, x: 75, y: 300, width: 150, height: 60 }
    : k === 2
      ? { orderNo: 2, page: 2, x: 370, y: 300, width: 150, height: 60 }
      : {
          orderNo: k,
          page: 2,
          x: 222 + ((k - 3) % 2) * 160 - (k > 3 ? 80 : 0),
          y: 540 + Math.floor((k - 3) / 2) * 90,
          width: 150,
          height: 60,
        };
/** Chữ ký đã đóng vào PDF giả (theo id tệp): vẽ vào ảnh trang. */
const stampStore: Record<number, { slot: SignSlot; sig: string; caption: string[] }[]> = {};

/**
 * PDF mẫu: 2 trang A4. Tệp tải lên có sẵn annotation ô ký số 1 ở trang 2 (để thấy phần mềm đọc được ô có sẵn); tệp
 * của văn bản mẫu có đủ ô cho mọi người ký, ô của người đã ký thì đã được đóng chữ ký.
 */
function layoutOf(attachmentId: number, d?: SignRequestDetail): SlotLayout {
  if (slotStore[attachmentId]) return slotStore[attachmentId];
  const seeded = d && attachmentId === d.id * 10;
  const slots = seeded ? d.participants.map((p) => slotAt(p.orderNo)) : [slotAt(1)];
  slotStore[attachmentId] = { pages: [A4, A4], slots };
  if (seeded)
    d.participants
      .filter((p) => p.status === 'SIGNED')
      .forEach((p) =>
        stamp(d, attachmentId, p.orderNo, signatureOf(p.userId) ?? SAMPLE_SIGNATURE, [p.fullName, fmt(p.signedAt ?? now())]),
      );
  return slotStore[attachmentId];
}

const fmt = (iso: string) => `${iso.slice(8, 10)}/${iso.slice(5, 7)}/${iso.slice(0, 4)} ${iso.slice(11, 16)}`;

/** Đóng chữ ký vào mọi ô số `orderNo` của tệp: bỏ ô, thêm vào ảnh trang, đánh dấu đã có bản đã ký. */
function stamp(d: SignRequestDetail, attachmentId: number, orderNo: number, sig: string, caption: string[]) {
  const l = slotStore[attachmentId];
  const mine = l.slots.filter((s) => s.orderNo === orderNo);
  if (!mine.length) return;
  l.slots = l.slots.filter((s) => s.orderNo !== orderNo);
  (stampStore[attachmentId] ??= []).push(...mine.map((slot) => ({ slot, sig, caption: slot.height >= 36 ? caption : [] })));
  const a = d.attachments.find((x) => x.id === attachmentId);
  if (a) {
    a.signed = true;
    a.signedSizeBytes = a.sizeBytes + (stampStore[attachmentId]?.length ?? 1) * 6144;
    a.signedSha256 = fakeSha(`${attachmentId}-${stampStore[attachmentId]?.length}`);
    a.signedAt = now();
  }
}

/** Mã hex 64 ký tự giả (preview không có tệp thật để băm). */
const fakeSha = (seed: string) =>
  Array.from({ length: 64 }, (_, i) => ((seed.charCodeAt(i % seed.length) * 31 + i * 7) % 16).toString(16)).join('');

/** Ảnh trang giả (SVG) cho bản preview: tiêu đề, các dòng chữ, chỗ ký ở trang 2, chữ ký đã đóng. */
function pageImage(name: string, page: number, attachmentId: number, original = false): string {
  if (original) return pageImageBase(name, page, '');
  const esc = (t: string) => t.replace(/[<>&"]/g, '');
  const stamps = (stampStore[attachmentId] ?? [])
    .filter((s) => s.slot.page === page)
    .map(({ slot, sig, caption }) => {
      const capH = caption.length ? caption.length * 9 + 2 : 0;
      const img = `<image href="${sig}" x="${slot.x}" y="${slot.y}" width="${slot.width}" height="${slot.height - capH}" preserveAspectRatio="xMidYMid meet"/>`;
      const text = caption
        .map(
          (l, i) =>
            `<text x="${slot.x + slot.width / 2}" y="${slot.y + slot.height - capH + 9 + i * 9}" text-anchor="middle" font-size="8">${esc(l)}</text>`,
        )
        .join('');
      return img + text;
    })
    .join('');
  return pageImageBase(name, page, stamps);
}

function pageImageBase(name: string, page: number, extra: string): string {
  const lines = (from: number, count: number) =>
    Array.from(
      { length: count },
      (_, i) =>
        `<rect x="60" y="${from + i * 22}" width="${[470, 440, 455, 410, 470, 360][i % 6]}" height="7" rx="3" fill="#e8eaee"/>`,
    ).join('');
  const title = name
    .replace(/\.pdf$/i, '')
    .replace(/[<>&"]/g, '')
    .toUpperCase();
  const body =
    page === 1
      ? `<text x="297" y="70" text-anchor="middle" font-size="11" font-weight="700">CỘNG HÒA XÃ HỘI CHỦ NGHĨA VIỆT NAM</text>` +
        `<text x="297" y="86" text-anchor="middle" font-size="10">Độc lập – Tự do – Hạnh phúc</text>` +
        `<text x="297" y="130" text-anchor="middle" font-size="16" font-weight="700">${title}</text>` +
        lines(170, 26)
      : lines(60, 10) +
        `<text x="150" y="285" text-anchor="middle" font-size="11" font-weight="700">ĐẠI DIỆN BÊN A</text>` +
        `<text x="445" y="285" text-anchor="middle" font-size="11" font-weight="700">ĐẠI DIỆN BÊN B</text>` +
        `<text x="297" y="520" text-anchor="middle" font-size="11" font-weight="700">NGƯỜI PHÊ DUYỆT</text>`;
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 595 842" font-family="Times New Roman, serif" fill="#222"><rect width="595" height="842" fill="#fff"/>${body}${extra}</svg>`;
  return 'data:image/svg+xml;utf8,' + encodeURIComponent(svg);
}

/** Ảnh chữ ký đã lưu của người dùng giả (null = chưa có). */
let mySignature: { imageDataUrl: string; updatedAt: string } | null = { imageDataUrl: SAMPLE_SIGNATURE, updatedAt: now() };
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
  const mode = extra.mode ?? 'SEQ';
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
      stepNo: mode === 'PAR' ? 1 : i + 1,
      status,
      signedAt: status === 'SIGNED' || status === 'REJECTED' ? now() : undefined,
    })),
    watchers: [],
    attachments: [
      {
        id: id * 10,
        name: `${title}.pdf`,
        sizeBytes: 245760,
        signable: true,
        uploadedAt: now(),
        signed: signers.some(([, st]) => st === 'SIGNED'),
        ...(signers.some(([, st]) => st === 'SIGNED')
          ? { signedSizeBytes: 245760 + 6144 * signers.length, signedSha256: fakeSha(String(id)), signedAt: now() }
          : {}),
      },
    ],
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
    mode: (b.signerIds ?? []).length > 1 && stepsOf(b).every((x) => x === 1) ? 'PAR' : (b.mode ?? 'SEQ'),
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
      stepNo: stepsOf(b)[i],
      status: 'WAITING' as const,
    })),
  });
  if (!d) DOCS.unshift(base);
  log(d ? 'UPDATE' : 'CREATE', `SignRequest#${base.id}`, base.title);
  return view(base);
}

/** Bước ký như BE: song song = 1; tuần tự không truyền bước = mỗi người một bước. */
const stepsOf = (b: SaveSignRequestInput) =>
  (b.signerIds ?? []).map((_, i) => (b.mode === 'PAR' ? 1 : (b.signerSteps?.[i] ?? i + 1)));

/** Mở bước nhỏ nhất còn người chờ (mọi người trong bước cùng nhận yêu cầu). */
function activateNextStep(d: SignRequestDetail) {
  const waiting = d.participants.filter((x) => x.status === 'WAITING');
  if (!waiting.length) return;
  const step = Math.min(...waiting.map((x) => x.stepNo));
  waiting.filter((x) => x.stepNo === step).forEach((x) => (x.status = 'PENDING'));
}

function setStatus(d: SignRequestDetail, s: DocStatus) {
  d.status = s;
  if (s === 'COMPLETED') d.completedAt = now();
}

function route(method: string, path: string, q: URLSearchParams, body: unknown, perms: string[]): unknown {
  const m = (re: RegExp) => path.match(re);
  let r: RegExpMatchArray | null;
  if (method === 'GET' && path === '/me') {
    const me: Me = {
      ...person(ME_ID),
      employeeCode: 'NV000004',
      permissions: perms,
      hasSignature: !!mySignature,
      signatureUpdatedAt: mySignature?.updatedAt,
    };
    return me;
  }
  if (path === '/me/signature' || path === '/me/signature/preview') {
    if (method === 'GET') {
      if (!mySignature) throw new Problem(404, 'NOT_FOUND', 'Ảnh chữ ký của người dùng không tồn tại: ' + ME_ID);
      return mySignature;
    }
    if (method === 'DELETE') {
      if (!mySignature) throw new Problem(404, 'NOT_FOUND', 'Ảnh chữ ký của người dùng không tồn tại: ' + ME_ID);
      mySignature = null;
      log('SIGNATURE_DELETE', 'AppUser#' + ME_ID);
      return undefined;
    }
    // ảnh đã tách nền do installDemoBackend tính sẵn (canvas); test/E2E không có canvas → chữ ký mẫu
    const imageDataUrl = (body as { imageDataUrl?: string } | undefined)?.imageDataUrl ?? SAMPLE_SIGNATURE;
    if (path.endsWith('/preview')) return { imageDataUrl, updatedAt: null };
    mySignature = { imageDataUrl, updatedAt: now() };
    log('SIGNATURE_UPDATE', 'AppUser#' + ME_ID);
    return mySignature;
  }
  if (method === 'GET' && path === '/users') return PEOPLE.filter((x) => x.active).map((x) => person(x.id));
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
        {
          const orders = new Set(
            d.attachments.filter((a) => a.signable).flatMap((a) => layoutOf(a.id, d).slots.map((x) => x.orderNo)),
          );
          const n = d.participants.length;
          const missing = Array.from({ length: n }, (_, i) => i + 1).filter((k) => !orders.has(k));
          if (missing.length || [...orders].some((k) => k > n))
            throw new Problem(
              422,
              'BUSINESS_RULE',
              `Ô ký trong tệp PDF chưa khớp người ký.${missing.length ? ` Thiếu ô số ${missing.join(', ')}.` : ''}`,
            );
        }
        d.code = d.code ?? `${'HD'}-2026-${String(++counter).padStart(4, '0')}`;
        d.submittedAt = now();
        setStatus(d, 'PENDING');
        d.participants.forEach((x) => (x.status = 'WAITING'));
        activateNextStep(d);
        break;
      case 'sign': {
        const me = d.participants.find((x) => x.userId === ME_ID && x.status === 'PENDING');
        if (!me) throw new Problem(409, 'CONFLICT', 'Quy trình đang ở bước trước. Hệ thống sẽ thông báo khi đến lượt của bạn.');
        if (!mySignature)
          throw new Problem(422, 'BUSINESS_RULE', 'Bạn chưa có ảnh chữ ký. Vào Thông tin cá nhân để tải ảnh chữ ký rồi ký lại.');
        Object.assign(me, { status: 'SIGNED', signedAt: now(), note });
        const showCaption = (body as { showCaption?: boolean } | undefined)?.showCaption !== false;
        for (const a of d.attachments.filter((x) => x.signable)) {
          layoutOf(a.id, d);
          stamp(d, a.id, me.orderNo, mySignature.imageDataUrl, showCaption ? [me.fullName, fmt(now())] : []);
        }
        if (!d.participants.some((x) => x.status === 'PENDING')) activateNextStep(d);
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
  if ((r = m(/^\/sign-requests\/(\d+)\/signer-signatures$/)) && method === 'GET') {
    return find(Number(r[1])).participants.map((x) => ({ userId: x.userId, imageDataUrl: signatureOf(x.userId) }));
  }
  if ((r = m(/^\/sign-requests\/(\d+)\/attachments$/)) && method === 'POST') {
    const d = find(Number(r[1]));
    const f = (body as FormData).get('file') as File;
    const a = {
      id: ++seq,
      name: f.name,
      sizeBytes: f.size,
      signable: q.get('signable') !== 'false',
      uploadedAt: now(),
      signed: false,
    };
    d.attachments.push(a);
    return a;
  }
  if ((r = m(/^\/sign-requests\/(\d+)\/attachments\/(\d+)\/slots$/))) {
    const d = find(Number(r[1]));
    const a = d.attachments.find((x) => x.id === Number(r![2]));
    if (!a) throw new Problem(404, 'NOT_FOUND', 'Tệp đính kèm không tồn tại: ' + r[2]);
    const l = layoutOf(a.id, d);
    if (method === 'PUT') {
      if (d.status !== 'DRAFT') throw new Problem(409, 'CONFLICT', 'Chỉ sửa được tệp khi văn bản là bản nháp');
      l.slots = ((body as { slots?: SignSlot[] } | undefined)?.slots ?? []).map((x) => ({ ...x }));
      log('SLOTS_UPDATE', `SignRequest#${d.id}`, `${a.name}: ${l.slots.length} ô ký`);
    }
    return { pages: l.pages, slots: l.slots };
  }
  if ((r = m(/^\/sign-requests\/(\d+)\/attachments\/(\d+)\/pages\/(\d+)$/)) && method === 'GET') {
    const pd = find(Number(r[1]));
    const a = pd.attachments.find((x) => x.id === Number(r![2]));
    if (!a) throw new Problem(404, 'NOT_FOUND', 'Tệp đính kèm không tồn tại: ' + r[2]);
    layoutOf(a.id, pd);
    return { imageDataUrl: pageImage(a.name, Number(r[3]), a.id, q.get('original') === 'true') };
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
  mySignature = { imageDataUrl: SAMPLE_SIGNATURE, updatedAt: now() }; // người dùng mẫu đã có chữ ký (xoá ở trang cá nhân để thử)
  for (const k of Object.keys(stampStore)) delete stampStore[Number(k)];
  for (const k of Object.keys(slotStore)) delete slotStore[Number(k)];
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
    let body = typeof init.body === 'string' ? JSON.parse(init.body) : init.body;
    await new Promise((res) => setTimeout(res, 150));
    if (body instanceof FormData && /\/me\/signature(\/preview)?$/.test(path)) {
      try {
        body = { imageDataUrl: await removeBackground(body.get('file') as File) };
      } catch (e) {
        const d = e instanceof DemoSignatureError ? e : new DemoSignatureError('INVALID_IMAGE', 'Không đọc được ảnh');
        return Response.json({ status: 422, code: 'BUSINESS_RULE', reason: d.reason, detail: d.message }, { status: 422 });
      }
    }
    const r = demoReply(init.method ?? 'GET', path, perms, u.searchParams, body);
    return r.body === undefined ? new Response(null, { status: r.status }) : Response.json(r.body, { status: r.status });
  };
}
