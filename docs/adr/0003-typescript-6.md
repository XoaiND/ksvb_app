# 0003 – TypeScript 6.0 cho frontend

Ngày: 15/11/2026, cập nhật 16/11/2026. Trạng thái: **đã thành chuẩn chung** (ECOSYSTEM.md 12.7: mọi app dùng TypeScript 6.0); ADR này chỉ giữ lý do.

## Bối cảnh
ECOSYSTEM.md 12.4 yêu cầu ESLint cho FE; `typescript-eslint` 8.x (bản mới nhất lúc làm) chỉ hỗ trợ `typescript < 6.1`; `openapi-typescript` 7.13 khai peer `typescript ^5`. TypeScript 7 (bản Go) chưa có JS API cho các công cụ này.

## Quyết định
- `frontend` dùng `typescript ~6.0`, ESLint và `openapi-typescript` cài trực tiếp trong `frontend/` (không gói riêng).
- `package.json` có `overrides` cho `openapi-typescript` dùng chung bản TypeScript của dự án (chỉ là khai báo peer, công cụ chạy đúng với TS 6).

## Hệ quả
- Khi `typescript-eslint` và `openapi-typescript` hỗ trợ TS 7: nâng cùng lúc cho mọi app và sửa bảng ở ECOSYSTEM.md 12.7.
