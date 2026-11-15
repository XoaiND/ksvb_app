# KSVB – Ký số văn bản

Soạn, trình ký nhiều cấp và theo dõi văn bản điện tử. Thuộc hệ sinh thái cùng HRM (`../hrm_app`): dùng chung Keycloak (realm `dev`) để đăng nhập/phân quyền và một PostgreSQL (DB riêng `ksvb`). Người dùng, đơn vị, chức danh lấy từ token Keycloak (nguồn gốc là HRM), KSVB không tự quản lý.

- **ksvb-be/**: Java 21, Spring Boot 4.1, Spring Data JPA (Hibernate 7), Flyway, Spring Security (JWT Keycloak), cổng **8082**
- **ksvb-fe/**: React 18 + TypeScript, Vite, react-router, keycloak-js, CSS tự viết (sáng/tối), cổng dev **5174**, docker **3001**

## Tài liệu (`docs/`)

| File | Nội dung |
|---|---|
| [requirements.md](docs/requirements.md) | Phạm vi, vai trò, danh sách chức năng (theo code hiện tại) |
| [business-rules.md](docs/business-rules.md) | Quy tắc nghiệp vụ: luồng ký, trạng thái, số hiệu, tệp, quyền xem |
| [database.md](docs/database.md) | ERD, mô tả bảng, Flyway |
| [PHAN_QUYEN.md](docs/PHAN_QUYEN.md) | Quyền chi tiết (client role `ksvb-api`) và role tổng hợp |
| [design/index.html](docs/design/index.html) | Preview bấm thử toàn bộ giao diện (mở thẳng trên trình duyệt, dữ liệu mẫu) |

## Chạy khi phát triển

**Bí mật** (mật khẩu DB) không ghi trong code:
- Backend chạy trên máy: `cp ksvb-be/.env.example ksvb-be/.env` rồi điền `KSVB_DB_PASSWORD` (backend tự đọc file này).
- Docker: `cp .env.example .env` (cạnh `docker-compose.yml`) rồi điền giá trị.
- Frontend: `cp ksvb-fe/.env.example ksvb-fe/.env.local` nếu cần đổi thông số Keycloak.
- Mọi file `.env` đã nằm trong `.gitignore`, không commit.

```bash
# backend (cần JDK 21+ và Maven)
cd ksvb-be
mvn spring-boot:run                          # Postgres + Keycloak thật, http://localhost:8082, Swagger /swagger-ui.html
SPRING_PROFILES_ACTIVE=h2 mvn spring-boot:run   # chạy nhanh không cần gì: H2 + dữ liệu mẫu, không đăng nhập

# frontend
cd ksvb-fe
npm install
npm run dev                                  # http://localhost:5174 (proxy /api -> 8082)
```

Chạy thử **không cần Keycloak**: backend `KSVB_SECURITY_ENABLED=false` (hoặc profile `h2`), frontend `VITE_AUTH_DISABLED=true`
(người dùng lấy theo header `X-User-Id` = `VITE_DEV_USER_ID`, chỉ dùng trên máy cá nhân).

Lần đầu trên Postgres có sẵn: chạy `ksvb-be/db/setup-postgres.sql` bằng tài khoản quản trị (tạo role `ksvb_app`, DB `ksvb`, schema `ksvb`), Flyway tự tạo bảng khi backend khởi động.
Keycloak: `docs/keycloak/setup-ksvb.sh` tạo client `ksvb-web`, `ksvb-api` và các quyền.

## Chạy bằng Docker (network ngoài `local-network`, dùng Postgres/Keycloak đang chạy)

```bash
docker compose up -d --build   # frontend: http://localhost:3001, backend: http://localhost:8082
```

## Kiểm thử

- Backend: `mvn test` (JUnit 5, MockMvc, H2; gồm cả chế độ JWT với token giả).
- Frontend: `npm test` (Vitest, backend giả lập ở `src/test/fakeBackend.ts`), `npm run build`.

## API (tiền tố `/api`)

| Method | Đường dẫn | Quyền |
|---|---|---|
| GET | `/me`, `/users` | đăng nhập |
| GET | `/dashboard?year=` | đăng nhập |
| GET | `/reports/summary` | `report.view` |
| GET | `/sign-requests?scope=pending\|mine\|shared\|watching&q&docType&unit&status&page&size` | đăng nhập |
| GET | `/sign-requests/{id}` | xem được văn bản (xem `business-rules.md`) |
| POST / PUT / DELETE | `/sign-requests`, `/sign-requests/{id}` | `document.create` |
| POST | `/sign-requests/{id}/submit`, `/recall`, `/cancel`, `/remind` | `document.create` |
| POST | `/sign-requests/{id}/sign`, `/reject` | `document.sign` |
| POST / GET / DELETE | `/sign-requests/{id}/attachments[/{attachmentId}]` | `document.create` (tải xuống: xem được văn bản) |
| GET / POST / DELETE | `/templates`, `/templates/{id}`, `POST /templates/{id}/use` | đăng nhập (mẫu của mình) |
| GET / PATCH | `/admin/users`, `/admin/users/{id}` | `user.manage` |
| GET | `/admin/audit-logs` | `audit.view` |

Lỗi trả về dạng ProblemDetail (RFC 7807), thông điệp tiếng Việt: 400 dữ liệu sai, 403 không có quyền, 404 không tồn tại, 409 sai trạng thái / xung đột.

## Chưa có

Ký số PKI thật (chứng thư số, PIN), xem PDF trong trình duyệt, tải ảnh chữ ký, gửi email thật (hiện chỉ ghi log), cấu hình hệ thống, quản lý chứng thư số, xuất Excel, sửa mẫu người nhận, lấy cây đơn vị từ API HRM, phân quyền dữ liệu theo đơn vị.
