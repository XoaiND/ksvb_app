# KSVB – Ký số văn bản

## Giới thiệu

KSVB cho phép soạn, trình ký nhiều cấp và theo dõi văn bản điện tử (tệp PDF): người soạn chọn người ký (tuần tự hoặc song
song) và người theo dõi; người ký ký hoặc từ chối khi đến lượt. Người dùng, đơn vị, chức danh lấy từ HRM qua claim của
token Keycloak, KSVB không tự quản lý. Kiến trúc và công nghệ theo chuẩn chung `../../docs/kien-truc-chuan.md`.

- `backend/`: Java 25, Spring Boot 4.1.2, PostgreSQL + Flyway, cổng 8082.
- `frontend/`: React 19, TypeScript 6.0, Vite 8, Ant Design 6, TanStack Query, cổng dev 5174.

| Tài liệu (`docs/`) | Nội dung |
|---|---|
| [kien-truc.md](docs/kien-truc.md) | Phần riêng của KSVB: tính năng, thành phần riêng, tích hợp, sự kiện outbox |
| [requirements.md](docs/requirements.md) | Phạm vi, vai trò, danh sách chức năng |
| [business-rules.md](docs/business-rules.md) | Luật nghiệp vụ: luồng ký, trạng thái, số hiệu, tệp, quyền xem, nhật ký, sự kiện |
| [database.md](docs/database.md) | ERD, bảng, migration |
| [phan-quyen.md](docs/phan-quyen.md) | Quyền, role tổng hợp, cách tạo trong Keycloak |
| [adr/](docs/adr) | Quyết định thiết kế |
| [design/index.html](docs/design/index.html) | Preview bấm thử toàn bộ giao diện, build từ code (`npm run build:design`) |
| `keycloak/` | `setup-ksvb.sh` (client `ksvb-web`/`ksvb-api`, quyền, role tổng hợp) |

## Chạy nhanh

Cần: JDK 25, Node 24, PostgreSQL (DB `ksvb`, role `ksvb_app`, tạo bằng `backend/db/setup-postgres.sql`), Keycloak realm
`dev` (xem [phan-quyen.md](docs/phan-quyen.md)).

```bash
# bí mật: chép mẫu rồi điền (file .env không commit)
cp backend/.env.example backend/.env        # KSVB_DB_PASSWORD

# backend (Maven qua wrapper)
cd backend
./mvnw spring-boot:run         # http://localhost:8082, Swagger: /swagger-ui.html (tắt ở profile prod)

# frontend
cd frontend
npm install
npm run dev                    # http://localhost:5174 (proxy /api -> 8082)
```

Chạy thử **không cần Keycloak**: backend `KSVB_SECURITY_ENABLED=false` (người dùng theo header `X-User-Id`) và
`KSVB_SEED_DEMO=true` (nạp người dùng + văn bản mẫu vào DB trống), frontend `VITE_AUTH_DISABLED=true` (gửi `X-User-Id` =
`VITE_DEV_USER_ID`) – chỉ dùng trên máy cá nhân, bị chặn ở profile `prod`. Vẫn cần Postgres (không có H2).
Lần đầu Flyway tự tạo bảng (`backend/src/main/resources/db/migration`).

## Cấu hình (biến môi trường)

Mọi biến của backend có tiền tố `KSVB_` (không đọc tên cũ không tiền tố). Bí mật không có giá trị mặc định.

| Biến | Mặc định | Ý nghĩa |
|---|---|---|
| `KSVB_DB_URL` / `KSVB_DB_USER` / `KSVB_DB_PASSWORD` / `KSVB_DB_SCHEMA` | `jdbc:postgresql://localhost:5432/ksvb` / `ksvb_app` / (bắt buộc) / `ksvb` | Kết nối PostgreSQL |
| `KSVB_OIDC_ISSUER_URI` | `https://sso.xoaind.io.vn/realms/dev` | Phải trùng claim `iss` của token (địa chỉ public Keycloak) |
| `KSVB_OIDC_JWK_SET_URI` | `http://localhost:8080/realms/dev/protocol/openid-connect/certs` | Nơi lấy khoá công khai; Docker ghi đè bằng `http://keycloak:8080/...` |
| `KSVB_SECURITY_ENABLED` / `KSVB_ROLE_CLIENT` | `true` / `ksvb-api` | Bắt buộc đăng nhập / client chứa quyền |
| `KSVB_CORS_ORIGINS` | `http://localhost:5174,http://127.0.0.1:5174,http://localhost:3001` | Origin được gọi API |
| `KSVB_STORAGE_PATH` | `./data/upload` (prod: `/app/data/upload`) | Thư mục lưu tệp PDF tải lên |
| `KSVB_SEED_DEMO` | `false` | Nạp dữ liệu mẫu vào DB trống (chỉ dev) |
| `KSVB_FLYWAY_ENABLED` | `true` | Chạy migration khi khởi động |
| `KSVB_API_DOCS_ENABLED` | dev `true`, prod `false` | Swagger/OpenAPI |
| `KSVB_LOG_FORMAT` | prod `ecs`, dev trống | Log JSON có cấu trúc: `ecs` \| `logstash` \| `gelf` |
| `KSVB_TRACING_SAMPLING` / `KSVB_TRACING_EXPORT_ENABLED` / `KSVB_OTLP_TRACES_ENDPOINT` | 0.1 / `false` / `http://localhost:4318/v1/traces` | Tracing OpenTelemetry (mặc định không gửi span) |
| `KSVB_OTLP_METRICS_ENABLED` / `KSVB_OTLP_LOGS_ENABLED` | `false` | Đẩy metrics / log qua OTLP |
| `KSVB_ACTUATOR_ENDPOINTS` | `health,info,metrics,threaddump,prometheus` | Endpoint actuator được mở |
| `KSVB_SERVER_PORT` | 8082 | Cổng backend |
| `KSVB_DB_POOL_MAX` / `KSVB_DB_POOL_MIN_IDLE` / `KSVB_DB_POOL_CONNECTION_TIMEOUT` / `KSVB_DB_POOL_MAX_LIFETIME` / `KSVB_DB_POOL_LEAK_DETECTION` / `KSVB_DB_TX_TIMEOUT` | 10 / 10 / 5000 ms / 1800000 ms / 0 / `30s` | Pool HikariCP và thời hạn transaction; tổng `số instance × KSVB_DB_POOL_MAX` phải nhỏ hơn `max_connections` của PostgreSQL |
| `KSVB_TOMCAT_THREADS_MAX` / `KSVB_TOMCAT_ACCEPT_COUNT` / `KSVB_VIRTUAL_THREADS_ENABLED` | 200 / 100 / `false` | Thread xử lý request |

Frontend (Vite): `VITE_API_BASE_URL` (mặc định `/api`), `VITE_KEYCLOAK_URL`, `VITE_KEYCLOAK_REALM`, `VITE_KEYCLOAK_CLIENT_ID`,
`VITE_AUTH_DISABLED`, `VITE_DEV_USER_ID`. Mẫu: `frontend/.env.example`.

## API

Đặc tả đầy đủ: Swagger `/swagger-ui.html` (dev) hoặc `frontend/openapi/openapi.json`. Quyền của từng API: [phan-quyen.md](docs/phan-quyen.md).

| Method | Đường dẫn | Quyền |
|---|---|---|
| GET | `/api/me`, `/api/users` | đăng nhập |
| GET | `/api/dashboard?year=` | đăng nhập |
| GET | `/api/reports/summary` | `report.view` |
| GET | `/api/sign-requests?scope=pending\|mine\|shared\|watching&q&docType&unit&status&page&size` | đăng nhập |
| GET | `/api/sign-requests/{id}` | xem được văn bản (xem [business-rules.md](docs/business-rules.md)) |
| POST / PUT / DELETE | `/api/sign-requests`, `/api/sign-requests/{id}` (PUT cần `versionNo`) | `document.create` |
| POST | `/api/sign-requests/{id}/submit`, `/recall`, `/cancel`, `/remind` | `document.create` |
| POST | `/api/sign-requests/{id}/sign`, `/reject` | `document.sign` |
| POST / GET / DELETE | `/api/sign-requests/{id}/attachments[/{attachmentId}]` | `document.create` (tải xuống: xem được văn bản) |
| GET / POST / DELETE | `/api/templates`, `/api/templates/{id}`, `POST /api/templates/{id}/use` | đăng nhập (mẫu của mình) |
| GET / PATCH | `/api/admin/users`, `/api/admin/users/{id}` | `user.manage` |
| GET | `/api/admin/audit-logs` | `audit.view` |

Lỗi trả về RFC 7807 (`application/problem+json`): `{ "status", "detail", "code", "reason"?, "errors"? }`.
- `code`: `VALIDATION_ERROR` (400), `UNAUTHORIZED` (401), `FORBIDDEN` (403), `NOT_FOUND` (404), `CONFLICT` (409: sai trạng thái,
  chưa đến lượt ký, lệch `versionNo`, vi phạm ràng buộc), `BUSINESS_RULE` (422), `INTERNAL_ERROR` (500).
- `reason`: mã nghiệp vụ chi tiết khi có (vd `NO_SIGNER`, `NO_PDF`, `REASON_REQUIRED`, `INVALID_PDF`, `NOT_YOUR_TURN`,
  `ALREADY_ACTED`, `CONCURRENT_UPDATE`).
- `errors`: mảng `{ field, message }` cho lỗi dữ liệu. `detail` luôn tiếng Việt. JSON trả cả trường `null`.
- Phân trang: `{ content, page, size, totalElements, totalPages }`, `page` từ 0, `size` tối đa 100.

## Kiểm tra

```bash
# backend (cần Docker cho Testcontainers)
./mvnw spotless:apply          # định dạng
./mvnw spotless:check verify   # unit + MockMvc + ArchUnit + tích hợp PostgreSQL 17

# frontend
npm run lint && npm run format:check && npm run build && npm test
npx playwright install chromium   # một lần
npm run build:design && npm run e2e
npx knip                          # export/thư viện thừa
npm audit --audit-level=high
```
- Test nằm cùng gói với lớp được test; test tích hợp kế thừa `PostgresIntegrationTest` (Testcontainers, profile `it`):
  Flyway chạy V1..Vn rồi Hibernate `ddl-auto=validate`.
- Test giao diện (Vitest + Testing Library) và E2E (Playwright, cổng 5182) chạy trên backend giả
  `frontend/src/design/demoBackend.ts`, không cần backend/Keycloak/DB. Thêm API mới mà giao diện gọi thì thêm phản hồi giả ở đó.
- Kiểu TypeScript của API sinh từ OpenAPI, không viết tay: đổi DTO → `cd backend && ./mvnw test -Dtest=OpenApiExportTest
  -Dksvb.openapi.out=../frontend/openapi/openapi.json` → `cd frontend && npm run gen:api` (CI kiểm lệch).
- CI: `.github/workflows/ci.yml`; Dependabot: `.github/dependabot.yml`.
- Kiểm tuân thủ chuẩn (ở thư mục hệ sinh thái): `bash docs/kiem-tra-chuan.sh`.

## Docker

```bash
cp .env.example .env           # KSVB_DB_PASSWORD
docker compose up -d --build   # frontend: http://localhost:3001, backend: http://localhost:8082
```
- Dùng network ngoài `local-network` (Postgres `postgres`, Keycloak `keycloak` chạy riêng); compose đặt
  `SPRING_PROFILES_ACTIVE=prod` (log JSON, Swagger tắt) và mount `./data` (vào `/app/data`; tệp lưu ở `data/upload`) để lưu tệp PDF.
- Image chạy bằng user không phải root (backend uid 10001, frontend `nginx-unprivileged` uid 101) và có `HEALTHCHECK`:
  backend `/actuator/health/liveness`, frontend `/healthz`. Frontend chờ backend `healthy` mới chạy.
- Nginx của frontend nghe cổng 8080 (compose `3001:8080`) và chuyển `/api` sang `ksvb-backend:8082`.
- Giám sát (cần quyền `system.monitor`): `/actuator/metrics`, `/actuator/prometheus`, `/actuator/threaddump`; probe
  `/actuator/health/liveness`, `/actuator/health/readiness` mở cho mọi người, không lộ chi tiết.

## Xử lý sự cố

| Hiện tượng | Nguyên nhân / cách xử lý |
|---|---|
| Backend không khởi động: `Schema validation` | Entity lệch bảng. Thêm migration `V<n>__...sql` (không sửa file đã áp dụng, kể cả chú thích) |
| Backend không khởi động ở `prod` khi `KSVB_SECURITY_ENABLED=false` | Cố ý chặn; bỏ biến đó |
| Mọi API trả 401 dù đã đăng nhập | `KSVB_OIDC_ISSUER_URI` không trùng `iss` của token; kiểm thêm `KSVB_OIDC_JWK_SET_URI` |
| API trả 403 dù có role | Token thiếu `aud=ksvb-api` hoặc client role; đăng xuất rồi đăng nhập lại ([phan-quyen.md](docs/phan-quyen.md)) |
| Menu/trang trống sau khi đổi quyền | Đăng xuất rồi đăng nhập lại để token có role mới |
| Sửa văn bản báo 409 `CONCURRENT_UPDATE` | Người khác vừa sửa; tải lại trang rồi sửa tiếp |
| Tải tệp lên báo 422 `INVALID_PDF` | Tệp cần ký phải là PDF thật (đầu tệp `%PDF-`), tối đa 20 MB |
| Build backend báo sai phiên bản Java | Đặt `JAVA_HOME` trỏ JDK 25 |
| Test tích hợp bị bỏ qua | Chưa bật Docker |
