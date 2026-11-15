import { authDisabled, devUserId, getToken } from '../auth';

const BASE: string = import.meta.env.VITE_API_BASE_URL ?? '/api';

/** Một lỗi kiểm tra dữ liệu (`errors[]` trong ProblemDetail). */
export interface FieldError {
  field: string;
  message: string;
}

/**
 * Lỗi từ backend (RFC 7807, ECOSYSTEM.md 12.2): `message` là `detail` tiếng Việt, `code` là mã ổn định
 * (`VALIDATION_ERROR`, `NOT_FOUND`, `FORBIDDEN`, `CONFLICT`, `BUSINESS_RULE`, `UNAUTHORIZED`, `INTERNAL_ERROR`),
 * `errors` là lỗi theo từng trường (rỗng nếu không phải lỗi kiểm tra dữ liệu).
 */
export class ApiError extends Error {
  readonly status: number;
  readonly code: string;
  readonly errors: FieldError[];

  constructor(status: number, message: string, code = '', errors: FieldError[] = []) {
    super(message);
    this.name = 'ApiError';
    this.status = status;
    this.code = code;
    this.errors = errors;
  }

  /** Thông điệp lỗi của một trường, nếu có. */
  fieldError(field: string): string | undefined {
    return this.errors.find((e) => e.field === field)?.message;
  }
}

type Query = Record<string, string | number | boolean | undefined | null>;

interface Options {
  query?: Query;
  body?: unknown;
  form?: FormData;
}

function url(path: string, query?: Query): string {
  const qs = new URLSearchParams();
  Object.entries(query ?? {}).forEach(([k, v]) => {
    if (v !== undefined && v !== null && v !== '') qs.set(k, String(v));
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
  let detail = '';
  let code = '';
  let errors: FieldError[] = [];
  try {
    const body = await res.json();
    detail = typeof body?.detail === 'string' ? body.detail : '';
    code = typeof body?.code === 'string' ? body.code : '';
    if (Array.isArray(body?.errors)) {
      errors = body.errors.filter(
        (e: unknown): e is FieldError =>
          typeof (e as FieldError)?.field === 'string' && typeof (e as FieldError)?.message === 'string',
      );
    }
  } catch {
    /* không phải JSON */
  }
  const fallback: Record<number, string> = {
    401: 'Phiên đăng nhập đã hết hạn. Vui lòng đăng nhập lại.',
    403: 'Bạn không có quyền thực hiện thao tác này.',
    404: 'Không tìm thấy dữ liệu.',
    413: 'Tệp vượt quá dung lượng cho phép.',
  };
  return new ApiError(res.status, detail || fallback[res.status] || `Lỗi hệ thống (${res.status})`, code, errors);
}

export async function request<T>(method: string, path: string, opts: Options = {}): Promise<T> {
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

/** Tải tệp (có gắn token) rồi cho trình duyệt lưu. */
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
