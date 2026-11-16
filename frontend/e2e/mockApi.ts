import type { Page, Route } from '@playwright/test';
import { demoReply, resetDemoData } from '../src/design/demoBackend';

/**
 * Chặn mọi lời gọi /api/** và trả dữ liệu mẫu của backend giả (src/design/demoBackend.ts, dùng chung với bản preview).
 * overrides: từng test thay phản hồi theo "METHOD /đường-dẫn"; perms: quyền của người dùng giả (mặc định đủ quyền).
 * Chỉ chặn pathname bắt đầu bằng /api/ (không chặn nhầm file nguồn /src/shared/api/*.ts của Vite).
 */
export async function mockApi(p: Page, overrides: Record<string, (route: Route) => Promise<void>> = {}, perms?: string[]) {
  resetDemoData();
  await p.unrouteAll();
  await p.route(
    (url) => url.pathname.startsWith('/api/'),
    async (route) => {
      const req = route.request();
      const u = new URL(req.url());
      const path = u.pathname.replace(/^\/api/, '');
      const key = `${req.method()} ${path}`;
      if (overrides[key]) return overrides[key](route);
      const type = req.headers()['content-type'] ?? '';
      let body: unknown;
      if (type.includes('application/json')) body = req.postDataJSON();
      else if (type.includes('multipart/form-data')) {
        // tải tệp: backend giả chỉ cần tên và kích thước
        const raw = req.postData() ?? '';
        const name = /filename="([^"]+)"/.exec(raw)?.[1] ?? 'tep.pdf';
        body = { get: () => ({ name, size: raw.length }) };
      }
      const r = demoReply(req.method(), path, perms, u.searchParams, body);
      return route.fulfill({
        status: r.status,
        contentType: r.status >= 400 ? 'application/problem+json' : 'application/json',
        body: r.body === undefined ? '' : JSON.stringify(r.body),
      });
    },
  );
}
