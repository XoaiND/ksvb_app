import { authDisabled, devUserId, getToken } from '../auth/keycloak';

const BASE: string = import.meta.env.VITE_API_BASE_URL ?? '/api';

/** Một lỗi kiểm tra dữ liệu (`errors[]` trong ProblemDetail). */
export interface FieldError {
  field: string;
  message: string;
}

/** ProblemDetail (RFC 7807) của backend, docs/kien-truc-chuan.md 3.1. */
export interface Problem {
  status?: number;
  detail?: string;
  /** Mã chuẩn: VALIDATION_ERROR | UNAUTHORIZED | FORBIDDEN | NOT_FOUND | CONFLICT | BUSINESS_RULE | INTERNAL_ERROR. */
  code?: string;
  /** Mã nghiệp vụ chi tiết (tuỳ chọn). */
  reason?: string;
  errors?: FieldError[];
}

const FALLBACK: Record<number, string> = {
  401: 'Chưa đăng nhập hoặc phiên đăng nhập đã hết hạn',
  403: 'Không có quyền thực hiện',
  404: 'Không tìm thấy dữ liệu',
  413: 'Dữ liệu gửi lên quá lớn',
};

/** Câu thông báo cho người dùng từ ProblemDetail (lỗi từng trường ưu tiên hơn detail). */
function problemMessage(data: Problem | undefined | null, status?: number, fallback = 'Lỗi không xác định'): string {
  if (data?.errors?.length) return data.errors.map((e) => (e.field ? `${e.field}: ${e.message}` : e.message)).join('; ');
  if (data?.detail) return data.detail;
  return (status !== undefined && FALLBACK[status]) || fallback;
}

/**
 * Lỗi từ backend: `message` là câu cho người dùng (`detail` tiếng Việt hoặc `errors[]`), `code` là mã chuẩn,
 * `reason` là mã nghiệp vụ chi tiết, `errors` là lỗi theo từng trường, `body` là toàn bộ ProblemDetail (thuộc tính
 * thêm của từng lỗi, vd danh sách đang dùng khi xoá).
 */
export class ApiError extends Error {
  readonly status: number;
  readonly code: string;
  readonly detail: string;
  readonly reason: string;
  readonly errors: FieldError[];
  readonly body: Problem & Record<string, unknown>;

  constructor(status: number, body: Problem & Record<string, unknown>, message: string) {
    super(message);
    this.name = 'ApiError';
    this.status = status;
    this.body = body;
    this.code = typeof body.code === 'string' ? body.code : '';
    this.detail = typeof body.detail === 'string' ? body.detail : '';
    this.reason = typeof body.reason === 'string' ? body.reason : '';
    this.errors = Array.isArray(body.errors) ? body.errors : [];
  }

  /** Thông điệp lỗi của một trường, nếu có. */
  fieldError(field: string): string | undefined {
    return this.errors.find((e) => e.field === field)?.message;
  }
}

/** fetch ném TypeError khi không tới được máy chủ (mạng, CORS, máy chủ tắt). */
export const isNetworkError = (e: unknown): boolean => e instanceof TypeError;

type Query = Record<string, string | number | boolean | undefined | null>;

function url(path: string, query?: object): string {
  const qs = new URLSearchParams();
  Object.entries((query ?? {}) as Query).forEach(([k, v]) => {
    if (v !== undefined && v !== null) qs.set(k, String(v));
  });
  const s = qs.toString();
  return `${BASE}${path}${s ? `?${s}` : ''}`;
}

async function headers(json: boolean): Promise<Record<string, string>> {
  const h: Record<string, string> = {};
  if (json) h['Content-Type'] = 'application/json';
  if (authDisabled) {
    h['X-User-Id'] = devUserId;
  } else {
    const token = await getToken();
    if (token) h.Authorization = `Bearer ${token}`;
  }
  return h;
}

async function toError(res: Response): Promise<ApiError> {
  let body: Problem & Record<string, unknown> = {};
  try {
    const parsed = await res.json();
    if (parsed && typeof parsed === 'object') body = parsed;
  } catch {
    /* không phải JSON */
  }
  return new ApiError(res.status, body, problemMessage(body, res.status, `Lỗi hệ thống (${res.status})`));
}

/** @public Gọi API tuỳ ý (form, phương thức khác); get/post/put/del là dạng rút gọn. */
export async function request<T>(
  method: string,
  path: string,
  opts: { query?: object; body?: unknown; form?: FormData } = {},
): Promise<T> {
  const hasJson = opts.body !== undefined;
  const res = await fetch(url(path, opts.query), {
    method,
    headers: await headers(hasJson),
    body: opts.form ?? (hasJson ? JSON.stringify(opts.body) : undefined),
  });
  if (!res.ok) throw await toError(res);
  if (res.status === 204) return undefined as T;
  const text = await res.text();
  return (text ? JSON.parse(text) : undefined) as T;
}

/** @public Tải tệp (có gắn token) rồi cho trình duyệt lưu. */
export async function download(path: string, fileName: string): Promise<void> {
  const res = await fetch(url(path), { headers: await headers(false) });
  if (!res.ok) throw await toError(res);
  const blob = await res.blob();
  const a = document.createElement('a');
  a.href = URL.createObjectURL(blob);
  a.download = fileName;
  document.body.appendChild(a);
  a.click();
  a.remove();
  URL.revokeObjectURL(a.href);
}

/** Thông báo lỗi cho người dùng (ApiError → detail/errors[]; lỗi mạng → câu tiếng Việt). */
export function errorMessage(e: unknown): string {
  if (e instanceof ApiError) return e.message;
  if (isNetworkError(e)) return 'Không kết nối được máy chủ, vui lòng thử lại';
  return e instanceof Error && e.message ? e.message : 'Lỗi không xác định';
}

export const get = <T>(path: string, query?: object) => request<T>('GET', path, { query });
export const post = <T>(path: string, body?: object) => request<T>('POST', path, { body });
export const put = <T>(path: string, body?: object) => request<T>('PUT', path, { body });
export const del = <T>(path: string, query?: object) => request<T>('DELETE', path, { query });

export const seg = encodeURIComponent;
