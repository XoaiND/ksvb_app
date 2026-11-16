import { vi } from 'vitest';
import { demoReply, type DemoReply } from '../design/demoBackend';

interface Call {
  method: string;
  path: string;
  query: URLSearchParams;
  body: unknown;
}

type Route = (call: Call) => DemoReply;

/**
 * Thay `fetch` bằng backend giả cho test giao diện: mặc định trả dữ liệu mẫu của src/design/demoBackend.ts (dùng chung
 * với bản preview và E2E); `routes` đè từng lời gọi theo khoá "METHOD /đường-dẫn" (không gồm /api và query).
 */
export function installFetch(routes: Record<string, Route> = {}) {
  const calls: Call[] = [];
  const fn = vi.fn(async (input: RequestInfo | URL, init: RequestInit = {}) => {
    const u = new URL(String(input), 'http://localhost');
    const path = u.pathname.replace(/^\/api/, '');
    const method = (init.method ?? 'GET').toUpperCase();
    const body = typeof init.body === 'string' ? JSON.parse(init.body) : undefined;
    const call: Call = { method, path, query: u.searchParams, body };
    calls.push(call);
    const r = routes[`${method} ${path}`]?.(call) ?? demoReply(method, path);
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
