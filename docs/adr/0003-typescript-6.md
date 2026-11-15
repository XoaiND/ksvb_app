# 0003 – ksvb-fe dùng TypeScript 6.0, chưa lên 7 như HRM

Ngày: 15/11/2026. Trạng thái: đã áp dụng (Đợt 4, nhánh `chuan/dot-4-frontend`).

## Bối cảnh
HRM dùng TypeScript 7. ECOSYSTEM.md 12.4 yêu cầu ESLint cho FE; `typescript-eslint` 8.x (bản mới nhất lúc làm) chỉ hỗ trợ `typescript < 6.1`. `openapi-typescript` 7.13 khai peer `typescript ^5`.

## Quyết định
- ksvb-fe dùng `typescript ~6.0` để ESLint chạy được.
- `package.json` có `overrides` cho `openapi-typescript` dùng chung bản TypeScript của dự án (chỉ là khai báo peer, công cụ chạy đúng với TS 6).

## Hệ quả
- Lệch phiên bản TS với HRM. Khi `typescript-eslint` hỗ trợ TS 7 thì nâng và bỏ ADR này.
- Khi tách gói `_Project/shared/` cần thống nhất một bản TS cho cả hai app.
