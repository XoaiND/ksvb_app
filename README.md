# KSVB – Ký số văn bản

- **backend/**: Java 25 (LTS), Spring Boot 4.1.2, Spring Data JPA (Hibernate 7), Spring Security 7 (JWT Keycloak), PostgreSQL + Flyway, cổng **8082**
- **frontend/**: React 19 + TypeScript 6, Vite 8, Ant Design 6, TanStack Query 5, React Router 7, keycloak-js 26, cổng dev **5174**, docker **3001**

Soạn, trình ký nhiều cấp và theo dõi văn bản điện tử. Thuộc hệ sinh thái cùng HRM (`../hrm_app`, kiến trúc và công nghệ giống hệt – ECOSYSTEM.md 12.7): dùng chung Keycloak (realm `dev`) để đăng nhập/phân quyền và một PostgreSQL (DB riêng `ksvb`, schema `ksvb`). Người dùng, đơn vị, chức danh lấy từ token Keycloak (nguồn gốc là HRM), KSVB không tự quản lý. Schema do **Flyway** quản lý (`backend/src/main/resources/db/migration`): backend tự tạo/cập nhật bảng khi khởi động. Xem [docs/database.md](docs/database.md).

## Tài liệu (`docs/`)

| File | Nội dung |
|---|---|
| [requirements.md](docs/requirements.md) | Phạm vi, vai trò, danh sách chức năng (theo code hiện tại) |
| [business-rules.md](docs/business-rules.md) | Quy tắc nghiệp vụ: luồng ký, trạng thái, số hiệu, tệp, quyền xem, nhật ký, sự kiện |
| [database.md](docs/database.md) | ERD, mô tả bảng, Flyway |
| [PHAN_QUYEN.md](docs/PHAN_QUYEN.md) | Quyền chi tiết (client role `ksvb-api`) và role tổng hợp |
| [design/index.html](docs/design/index.html) | Preview bấm thử toàn bộ giao diện (mở thẳng trên trình duyệt, dữ liệu mẫu; build từ code) |
| `keycloak/` | Script cấu hình Keycloak (`setup-ksvb.sh`) |
| [adr/](docs/adr) | Quyết định thiết kế (ADR) |

## Chức năng

| Màn hình | Chức năng |
|---|---|
| Dashboard | Tổng quan văn bản, tài liệu của tôi, việc cần ký ngay, văn bản hoàn tất theo tháng |
| Soạn tài liệu | 3 bước: thông tin + tệp PDF cần ký/tệp tham khảo, người ký (tuần tự/song song, danh sách mẫu) + người theo dõi, xem lại và trình ký; lưu nháp |
| Lưu trữ tài liệu | Chờ tôi duyệt / tài liệu cá nhân / tài liệu chung; lọc theo tiêu đề/mã, loại, đơn vị, trạng thái; ký, xem, sửa/xoá nháp, huỷ |
| Chi tiết / ký | Trang giấy sơ đồ chữ ký, tệp đính kèm, luồng ký, lịch sử; ký (xác nhận đã đọc), từ chối (bắt buộc lý do), nhắc ký, thu hồi, huỷ |
| Tôi theo dõi, Người nhận mẫu, Báo cáo, Quản trị (người dùng, nhật ký) | Theo quyền |

Quy tắc nghiệp vụ chính (chi tiết: [business-rules.md](docs/business-rules.md)): ký tuần tự/song song, hoàn thành khi mọi người đã ký, huỷ/thu hồi chỉ người tạo và chỉ khi chưa ai ký, số hiệu `HD-2026-0001` do DB cấp, mọi thao tác ghi vào `audit_log` (cả khi bị chặn), sự kiện đổi trạng thái vào `ksvb_outbox` trong cùng transaction.

## Cấu hình Keycloak (realm `dev`)

1. Client `ksvb-web` (frontend): public, Standard flow, PKCE `S256`, redirect `http://localhost:5174/*`, `http://localhost:3001/*`.
2. Client `ksvb-api` (backend): client role = quyền chi tiết (`document.create`, `document.sign`, `report.view`, `user.manage`, `audit.view`, `system.monitor`...), gom thành role tổng hợp `role.user|leader|admin` ([PHAN_QUYEN.md](docs/PHAN_QUYEN.md)).
3. Token phải có `aud` = `ksvb-api` (audience mapper trên `ksvb-web`); backend đọc quyền từ `resource_access.ksvb-api.roles` (`KSVB_ROLE_CLIENT`), `/api/me` trả danh sách quyền để frontend ẩn/hiện nút. Claim `email`, `name`, `employee_code`, `unit_code`, `position_code` để tạo người dùng ở lần đăng nhập đầu.

## Chạy khi phát triển

**Bí mật** (mật khẩu DB) không ghi trong code:
- Chạy trên máy: `cp backend/.env.example backend/.env` rồi điền `KSVB_DB_PASSWORD` (backend tự đọc file này).
- Docker: `cp .env.example .env` (cạnh `docker-compose.yml`) rồi điền giá trị.
- Frontend: `cp frontend/.env.example frontend/.env.local` nếu cần đổi thông số Keycloak.
- Mọi file `.env` đã nằm trong `.gitignore`, không commit.

Lần đầu trên Postgres có sẵn: chạy `backend/db/setup-postgres.sql` bằng tài khoản quản trị (tạo role `ksvb_app`, DB `ksvb`, schema `ksvb`).

```bash
# backend (cần JDK 25; Maven qua wrapper)
cd backend
./mvnw spring-boot:run         # http://localhost:8082, Swagger: /swagger-ui.html (tắt ở profile prod)

# frontend
cd frontend
npm install
npm run dev                    # http://localhost:5174 (proxy /api -> 8082)
```

Chạy thử **không cần Keycloak**: backend `KSVB_SECURITY_ENABLED=false` (+ `KSVB_SEED_DEMO=true` để nạp dữ liệu mẫu vào DB trống), frontend `VITE_AUTH_DISABLED=true` (người dùng theo header `X-User-Id` = `VITE_DEV_USER_ID`, chỉ dùng trên máy cá nhân). Vẫn cần Postgres (không còn H2).

## Kiểm thử và chất lượng

```bash
# backend
./mvnw spotless:apply          # định dạng (CI chạy spotless:check)
./mvnw verify                  # unit + MockMvc + tích hợp PostgreSQL 17 (Testcontainers, cần Docker)

# frontend
npm run lint && npm run format:check && npm run build && npm test
```
- Test tích hợp: Postgres 17 trong Docker (profile `it`), Flyway chạy V1..Vn rồi Hibernate `ddl-auto=validate`; kiểm luồng ký, quyền (JWT giả), Specification, khoá `doc_counter` đồng thời, outbox, cột audit.
- Kiểu TypeScript của API sinh từ OpenAPI, không viết tay: đổi DTO → `cd backend && ./mvnw test -Dtest=OpenApiExportTest -Dksvb.openapi.out=../frontend/openapi/openapi.json` → `cd frontend && npm run gen:api` (CI kiểm lệch).
- Bản preview `docs/design/index.html`: `cd frontend && npm run build:design`.
- CI: `.github/workflows/ci.yml` (build + test BE, kiểm đặc tả OpenAPI, lint + format + build + test FE, `npm audit`, E2E); Dependabot: `.github/dependabot.yml`.

## Chạy bằng Docker (cùng network `local-network` với Postgres, Keycloak)

```bash
docker compose up -d --build   # frontend: http://localhost:3001, backend: http://localhost:8082
```
Backend kiểm tra `iss` = URL public của Keycloak (`KSVB_KEYCLOAK_PUBLIC_URL`, mặc định `https://sso.xoaind.io.vn`) + `/realms/dev`, lấy khoá từ `http://keycloak:8080/...` trong mạng Docker.
- Image chạy bằng user không phải root (backend uid 10001, frontend `nginx-unprivileged` uid 101 nghe 8080, compose map `3001:8080`) và có `HEALTHCHECK` (`docker ps` hiện `healthy`): backend gọi `/actuator/health/liveness`, frontend gọi `/healthz`. Frontend chờ backend healthy.
- Compose đặt `SPRING_PROFILES_ACTIVE=prod`: log JSON (ECS, có `traceId`/`spanId`), Swagger tắt.

## Log, tracing (OpenTelemetry)

| Biến | Mặc định | Ý nghĩa |
|---|---|---|
| `KSVB_LOG_FORMAT` | prod: `ecs`, dev: trống (chữ thường) | Log JSON có cấu trúc: `ecs` \| `logstash` \| `gelf` |
| `KSVB_TRACING_SAMPLING` | 0.1 | Tỉ lệ request được lấy mẫu tracing |
| `KSVB_TRACING_EXPORT_ENABLED` | false | Gửi span sang collector OTLP (Jaeger/Tempo/OTel Collector) |
| `KSVB_OTLP_TRACES_ENDPOINT` | `http://localhost:4318/v1/traces` | Địa chỉ OTLP HTTP nhận span |
| `KSVB_OTLP_METRICS_ENABLED` / `KSVB_OTLP_LOGS_ENABLED` | false | Gửi metrics / log qua OTLP |

## Test E2E (Playwright)

```bash
cd frontend
npx playwright install chromium   # một lần
npm run e2e                       # vite dev cổng 5182, VITE_AUTH_DISABLED=true, API giả lập (e2e/mockApi.ts)
```
Luồng: Dashboard, soạn → trình ký, ký (xác nhận đã đọc), từ chối (bắt buộc lý do), thiếu quyền. Không cần backend/Keycloak/DB. API giả dùng chung backend giả của bản preview (`src/design/demoBackend.ts`); thêm API mới mà trang gọi thì thêm vào đó.

## Keycloak: tạo client KSVB

`docs/keycloak/setup-ksvb.sh` (người dùng tự chạy, chưa thử trên Keycloak thật) tạo `ksvb-api` (client role = quyền, role tổng hợp `role.user|leader|admin`) và `ksvb-web` (public, PKCE, audience `ksvb-api`, claim `employee_code`/`unit_code`/`position_code`).

## Pool và theo dõi hiệu năng (backend Java)

| Biến môi trường | Mặc định | Ý nghĩa |
|---|---|---|
| `KSVB_DB_POOL_MAX` / `KSVB_DB_POOL_MIN_IDLE` | 10 / 10 | Số connection DB tối đa / giữ sẵn (HikariCP) |
| `KSVB_DB_POOL_CONNECTION_TIMEOUT` | 5000 ms | Chờ mượn connection quá thời gian này thì báo lỗi |
| `KSVB_DB_POOL_MAX_LIFETIME` | 1800000 ms | Tuổi tối đa 1 connection |
| `KSVB_DB_POOL_LEAK_DETECTION` | 0 (tắt) | Cảnh báo khi giữ connection quá lâu (dev nên đặt 20000) |
| `KSVB_DB_TX_TIMEOUT` | 30s | Transaction chạy quá lâu thì bị huỷ |
| `KSVB_TOMCAT_THREADS_MAX` / `KSVB_TOMCAT_ACCEPT_COUNT` | 200 / 100 | Thread xử lý request / hàng đợi khi hết thread |
| `KSVB_VIRTUAL_THREADS_ENABLED` | false | Chạy request trên virtual thread |

Tổng `số instance × KSVB_DB_POOL_MAX` phải nhỏ hơn `max_connections` của PostgreSQL.
Chỉ số (cần quyền `system.monitor`): `/actuator/metrics/hikaricp.connections.active|pending|acquire|usage`, `/actuator/metrics/tomcat.threads.busy`, `/actuator/threaddump`, `/actuator/prometheus`.
Mọi biến cấu hình mang tiền tố `KSVB_` (`KSVB_DB_URL|USER|PASSWORD|SCHEMA`, `KSVB_KEYCLOAK_ISSUER`, `KSVB_SERVER_PORT`, `KSVB_ACTUATOR_ENDPOINTS`, `KSVB_API_DOCS_ENABLED`, `KSVB_STORAGE_PATH`, `KSVB_SEED_DEMO`...). Không đọc tên không tiền tố.
Profile `prod` (compose đặt sẵn) tắt Swagger/OpenAPI; bật lại bằng `KSVB_API_DOCS_ENABLED=true`.
Probe: `/actuator/health/liveness` (sống), `/actuator/health/readiness` (sẵn sàng, gồm kết nối Postgres), không cần đăng nhập, không lộ chi tiết.
Schema: Flyway chạy migration rồi Hibernate `ddl-auto=validate` kiểm entity khớp bảng (lệch thì không khởi động).
Trong PostgreSQL, connection của backend có `application_name = 'ksvb-backend'`.

## API

| Method | Đường dẫn | Quyền |
|---|---|---|
| GET | `/api/me`, `/api/users` | đăng nhập |
| GET | `/api/dashboard?year=` | đăng nhập |
| GET | `/api/reports/summary` | `report.view` |
| GET | `/api/sign-requests?scope=pending\|mine\|shared\|watching&q&docType&unit&status&page&size` | đăng nhập |
| GET | `/api/sign-requests/{id}` | xem được văn bản (xem `business-rules.md`) |
| POST / PUT / DELETE | `/api/sign-requests`, `/api/sign-requests/{id}` | `document.create` |
| POST | `/api/sign-requests/{id}/submit`, `/recall`, `/cancel`, `/remind` | `document.create` |
| POST | `/api/sign-requests/{id}/sign`, `/reject` | `document.sign` |
| POST / GET / DELETE | `/api/sign-requests/{id}/attachments[/{attachmentId}]` | `document.create` (tải xuống: xem được văn bản) |
| GET / POST / DELETE | `/api/templates`, `/api/templates/{id}`, `POST /api/templates/{id}/use` | đăng nhập (mẫu của mình) |
| GET / PATCH | `/api/admin/users`, `/api/admin/users/{id}` | `user.manage` |
| GET | `/api/admin/audit-logs` | `audit.view` |

Danh sách phân trang trả `PageResponse` chung: `{content, page, size, totalElements, totalPages}` (`page` từ 0, `size` tối đa 100).

Lỗi trả về RFC 7807 (`application/problem+json`): `{ "status", "detail", "code", "reason"?, "errors"? }` (giống HRM).
- `code` luôn thuộc bộ mã chuẩn: `VALIDATION_ERROR` (400: dữ liệu sai, tệp không phải PDF, `scope` lạ), `NOT_FOUND` (404), `FORBIDDEN` (401 chưa đăng nhập / 403 không có quyền hoặc không liên quan văn bản), `CONFLICT` (409: sai trạng thái, chưa đến lượt ký, người khác vừa sửa, vi phạm ràng buộc DB), `BUSINESS_RULE` (422: vi phạm luật nghiệp vụ, vd. trình ký khi chưa có người ký/tệp PDF, từ chối không lý do), `INTERNAL_ERROR` (500).
- `reason`: mã chi tiết khi có (vd. `UNAUTHENTICATED`, `CONCURRENT_UPDATE`, `DATA_INTEGRITY`).
- `errors`: mảng `{ field, message }` khi `code = VALIDATION_ERROR`. `detail` luôn tiếng Việt, không lộ thông điệp SQL.

## Chưa có (bước tiếp theo)

- Worker đọc `ksvb_outbox` đẩy sự kiện đi (ADR 0002).
- Ký số PKI thật (chứng thư số, PIN), xem PDF trong trình duyệt, tải ảnh chữ ký, gửi email thật (hiện chỉ ghi log), cấu hình hệ thống, quản lý chứng thư số, xuất Excel, sửa mẫu người nhận.
- Lấy cây đơn vị từ API HRM, phân quyền dữ liệu theo đơn vị, client gửi `versionNo` khi sửa.
