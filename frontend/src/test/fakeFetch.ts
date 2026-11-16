import { vi } from 'vitest';
import { demoReply, resetDemoData } from '../design/demoBackend';

export interface Call {
  method: string;
  path: string;
  query: URLSearchParams;
  body: unknown;
  headers: Record<string, string>;
}

export type Reply = unknown | { __status: number; body?: unknown };
export type Route = (call: Call) => Reply;

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
