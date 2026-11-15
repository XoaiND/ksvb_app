import type { Page } from '@playwright/test';
import { handleDemoApi, resetDemoData } from '../src/design/demoBackend';

/**
 * API giả lập cho E2E: mọi lời gọi `/api/...` của trang được trả lời bằng backend giả dùng chung với bản preview
 * (src/design/demoBackend.ts, đúng cấu trúc DTO trong openapi/openapi.json). Mỗi lần gọi đưa dữ liệu mẫu về ban đầu.
 * `role` = role tổng hợp Keycloak của người đang thao tác (vd. role.user, role.leader, role.admin).
 */
export async function mockApi(page: Page, role = 'role.leader') {
  resetDemoData();
  // chỉ đường dẫn /api/... của backend (không chặn module Vite như /src/shared/api/http.ts)
  const isApi = (url: URL) => url.pathname.startsWith('/api/');
  await page.unrouteAll();
  await page.route(isApi, async (route) => {
    const req = route.request();
    const u = new URL(req.url());
    const path = u.pathname.replace(/^.*\/api/, '');
    let body: unknown;
    const type = req.headers()['content-type'] ?? '';
    if (type.includes('application/json')) body = req.postDataJSON();
    else if (type.includes('multipart/form-data')) {
      // chỉ cần tên và kích thước tệp tải lên
      const raw = req.postData() ?? '';
      const name = /filename="([^"]+)"/.exec(raw)?.[1] ?? 'tep.pdf';
      body = { get: () => ({ name, size: raw.length }) };
    }
    const r = handleDemoApi(req.method(), path, u.searchParams, body, role);
    await route.fulfill(
      r.body === undefined
        ? { status: r.status }
        : {
            status: r.status,
            contentType: r.status >= 400 ? 'application/problem+json' : 'application/json',
            body: JSON.stringify(r.body),
          },
    );
  });
}
