import { vi } from 'vitest';
import { demoReply, type DemoReply } from '../design/demoBackend';

export interface Call {
  method: string;
  path: string;
  query: URLSearchParams;
  body: unknown;
  /** Giá trị các tham số `:id` của khoá route đã khớp. */
  params: Record<string, string>;
}

export type Route = (call: Call) => DemoReply;

/** Khớp "GET /items/:id" với "GET /items/7" → { id: '7' }; null nếu không khớp. */
function match(pattern: string, actual: string): Record<string, string> | null {
  const p = pattern.split('/');
  const a = actual.split('/');
  if (p.length !== a.length) return null;
  const params: Record<string, string> = {};
  for (let i = 0; i < p.length; i++) {
    if (p[i].startsWith(':')) params[p[i].slice(1)] = decodeURIComponent(a[i]);
    else if (p[i] !== a[i]) return null;
  }
  return params;
}

/**
 * Thay `fetch` bằng backend giả cho test giao diện: mặc định trả dữ liệu mẫu của src/design/demoBackend.ts (dùng chung
 * với bản preview và E2E); `routes` đè từng lời gọi theo khoá "METHOD /đường-dẫn" (không gồm /api và query), đường dẫn
 * có thể chứa tham số `:id`.
 */
export function installFetch(routes: Record<string, Route> = {}) {
  const calls: Call[] = [];
  const fn = vi.fn(async (input: RequestInfo | URL, init: RequestInit = {}) => {
    const u = new URL(String(input), 'http://localhost');
    const path = u.pathname.replace(/^\/api/, '');
    const method = (init.method ?? 'GET').toUpperCase();
    const body = typeof init.body === 'string' ? JSON.parse(init.body) : undefined;
    let route: Route | undefined;
    let params: Record<string, string> = {};
    for (const [key, handler] of Object.entries(routes)) {
      const [m, ...rest] = key.split(' ');
      const found = m === method ? match(rest.join(' '), path) : null;
      if (found) {
        route = handler;
        params = found;
        break;
      }
    }
    const call: Call = { method, path, query: u.searchParams, body, params };
    calls.push(call);
    const r = route?.(call) ?? demoReply(method, path, undefined, u.searchParams, body);
    return new Response(r.body === undefined ? null : JSON.stringify(r.body), {
      status: r.body === undefined && r.status === 200 ? 204 : r.status,
      headers: { 'Content-Type': 'application/json' },
    });
  });
  vi.stubGlobal('fetch', fn);
  return { calls, fn };
}

/** Phản hồi lỗi RFC 7807 cho `routes`. */
export const fail = (status: number, code: string, detail: string, errors?: { field: string; message: string }[]): DemoReply => ({
  status,
  body: { status, code, detail, errors },
});
