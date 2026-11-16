# KSVB – trình ký / ký số văn bản
Tài liệu: `README.md` (chạy, API), `docs/` (xem dưới). Mọi tài liệu viết theo code hiện tại; đổi nghiệp vụ/giao diện thì sửa tài liệu cùng code. Kiến trúc và công nghệ giống hệt HRM (`_Project/hrm_app`, ECOSYSTEM.md 12.7): chỉ khác tên app/tiền tố (`ksvb`/`KSVB_`), gói (`vn.vbi.ksvb`), cổng và nghiệp vụ.

## Cấu trúc
- Hệ sinh thái: HRM là nguồn gốc dữ liệu nhân sự (đơn vị, chức danh, nhân viên); KSVB trình ký văn bản. Chung một Postgres (mỗi app DB/schema riêng) và một Keycloak realm `dev` (SSO, client role riêng từng app). KSVB không tự quản lý đơn vị/nhân viên, không tự làm đăng nhập/mật khẩu.
- `backend/`: Java 25 + Spring Boot 4.1.2, JPA/Hibernate 7, Postgres + Flyway, JWT Keycloak, Jackson 3. Gói gốc `vn.vbi.ksvb`, chia theo tính năng (ECOSYSTEM.md 12.1): `signrequest`, `template`, `user`, `report` (dashboard, báo cáo), `admin` — mỗi cái `api/` (controller mỏng), `application/` (service + DTO record, ADR 0001), `domain/` (entity + luật nghiệp vụ, không Spring), `infra/` (repository, Specification, gửi thông báo); `shared/` (`error` = `GlobalExceptionHandler`/`ApiErrorCode`/`BusinessException`, `security` = `SecurityConfig`/`Permissions`/`CurrentUser`/`DevUserFilter`/`ProblemResponses`, `audit` = `Auditable`/`AuditService`/`BlockedActionAuditor`, `outbox`, `paging` = `PageResponse`); `config/` (`KsvbProperties`, `OpenApiConfig`, `DemoDataLoader`). Chiều phụ thuộc kiểm bằng `ArchitectureTest` (ArchUnit): lớp mới phải đặt đúng tầng.
- `frontend/`: React 19 + TypeScript 6 + Vite 8 + Ant Design 6 + TanStack Query 5 + react-router 7 + keycloak-js, gọi API bằng `fetch` (`shared/api/http.ts`).
- `docs/`: `requirements.md`, `business-rules.md` (luồng ký, trạng thái, số hiệu, nhật ký, sự kiện), `database.md` (ERD, Flyway), `PHAN_QUYEN.md` (quyền, role tổng hợp), `design/index.html` (preview bấm thử, build từ code), `adr/` (quyết định thiết kế), `keycloak/setup-ksvb.sh` (client `ksvb-web`/`ksvb-api`, quyền, role tổng hợp – người dùng tự chạy).
- `docker-compose.yml`: chạy `ksvb-backend` (8082) + `ksvb-frontend` (nginx, host 3001 → 8080 trong container, proxy `/api` → `ksvb-backend:8082`), dùng network ngoài `local-network` (Postgres, Keycloak chạy riêng). Mẫu biến: `.env.example`.

## Chạy / build / test
- Frontend (trong `frontend/`): `npm run dev` (cổng 5174 `strictPort`, proxy `/api` → 8082), `npm run build` (= `tsc -b && vite build`). Test: `npm test` (Vitest, jsdom; `src/test/setup.ts` có stub ResizeObserver/matchMedia/getComputedStyle cho AntD; backend giả `src/test/fakeBackend.ts`): `app/App.test.tsx` (các màn chính), `features/documents/api.test.ts` (lớp gọi API, RFC 7807). Lint: `npm run lint` (ESLint flat config), `npm run format` / `format:check` (Prettier, `.prettierrc.json` giống HRM).
- Backend (trong `backend/`): `./mvnw -B -DskipTests compile`, `./mvnw spring-boot:run` (cổng 8082, Swagger `/swagger-ui.html`, tắt ở profile `prod`; cần Postgres – không còn H2). Test: `./mvnw -B verify` (**cần Docker**: mọi test có DB chạy PostgreSQL 17 trong Testcontainers, profile `it` = `src/test/resources/application-it.yml`, URL `jdbc:tc:postgresql:17-alpine:///<tên>`, mỗi tên DB một container). Test nằm cùng gói lớp được test: `signrequest/domain/SignRequestWorkflowTest` (luật thuần), `signrequest/api/SignRequestApiTest` (MockMvc, chế độ dev), `signrequest/application/PostgresIntegrationTest` (schema `ksvb` như thật: Flyway + validate, Specification, khoá `doc_counter` đồng thời, outbox, cột audit), `shared/security/JwtModeApiTest` (JWT: 401/403, tự tạo người dùng từ claim), `shared/error/GlobalExceptionHandlerTest`, `config/ApiDocsProfileTest` (Swagger tắt ở prod), `config/OpenApiExportTest`, `ArchitectureTest`. Định dạng: `./mvnw spotless:apply` (CI chạy `spotless:check`).
- Kiểu API: KHÔNG viết tay. `frontend/openapi/openapi.json` xuất từ backend (`./mvnw test -Dtest=OpenApiExportTest -Dksvb.openapi.out=../frontend/openapi/openapi.json`), rồi `npm run gen:api` sinh `src/shared/api/schema.d.ts` (không qua Prettier). Record DTO: trường có thể null gắn `@Nullable` (JSpecify), còn lại `required` (`config/OpenApiConfig`). Đổi DTO thì chạy lại hai lệnh (CI kiểm lệch).
- E2E: `npm run e2e` (Playwright, `e2e/*.e2e.ts`, vite dev cổng 5182; API giả lập `e2e/mockApi.ts` dùng chung backend giả của bản preview `src/design/demoBackend.ts`, chặn theo `pathname.startsWith("/api/")`; không cần backend/Keycloak/Postgres). Lần đầu: `npx playwright install chromium`.
- Bản preview `docs/design/index.html`: `npm run build:design` (`vite.design.config.ts`, entry `src/design/`).
- Vận hành: log JSON ECS ở profile `prod` (`KSVB_LOG_FORMAT`), tracing OpenTelemetry (`KSVB_TRACING_*`, `KSVB_OTLP_*`, mặc định không gửi), `/actuator/prometheus` (quyền `system.monitor`), Docker image non-root (BE uid 10001, FE `nginx-unprivileged` uid 101 nghe 8080) + `HEALTHCHECK` (BE liveness qua `/dev/tcp`, FE `/healthz`).
- CI: `.github/workflows/ci.yml` (BE: spotless:check + verify + kiểm đặc tả OpenAPI; FE: gen:api không lệch, lint, format:check, build, test, `npm audit --audit-level=high`; job e2e), `.github/dependabot.yml`. CI chưa chạy trên GitHub (chưa push).
- Máy DoanND: JDK 25 ở `C:\Users\DoanND\.jdks\openjdk-25.0.2` (không có trong PATH: đặt `JAVA_HOME` rồi gọi `./mvnw`), Maven qua `mvnw` (3.9.11, kho `D:\_Cache\maven`), Node 24, có Docker Desktop (Testcontainers chạy được), không có Python.
- Chạy không cần Keycloak: backend `KSVB_SECURITY_ENABLED=false` (người dùng theo header `X-User-Id`, quyền suy từ `app_user.role`; bị chặn ở profile `prod`) + `KSVB_SEED_DEMO=true` (nạp dữ liệu mẫu vào DB trống: user 1..10 + admin 11), frontend `VITE_AUTH_DISABLED=true` (gửi `X-User-Id` = `VITE_DEV_USER_ID`, mặc định 4).
- Xem qua Tailscale: dev server nghe `127.0.0.1:5174`; `tailscale serve` (người dùng tự chạy) + `VITE_ALLOWED_HOSTS` nếu không phải `.ts.net`, hoặc `VITE_HOST=<IP Tailscale>`. Phải dùng chế độ không Keycloak ở trên.
- Không tự chạy server chạy mãi; dùng `/serve` của bot.

## Hạ tầng cục bộ (giá trị bí mật nằm ngoài repo)
- Cổng: Keycloak 8080, HRM backend 8081, HRM frontend 5173/3000, Postgres 5432; KSVB backend **8082**, frontend dev **5174**, docker **3001**, E2E 5182.
- Postgres `localhost:5432`, DB `ksvb`, schema `ksvb` (`KSVB_DB_SCHEMA`), role `ksvb_app`. Tạo DB lần đầu: `backend/db/setup-postgres.sql` (người dùng chạy tay bằng tài khoản quản trị; bot không có psql).
- Keycloak `localhost:8080`/`sso.xoaind.io.vn`, realm `dev`; client `ksvb-web` (public, PKCE) và `ksvb-api` (client role = quyền), tạo bằng `docs/keycloak/setup-ksvb.sh` (chưa chạy thử). Token `iss` = địa chỉ trình duyệt thấy (`KSVB_KEYCLOAK_ISSUER`); trong Docker khoá công khai lấy qua `SPRING_SECURITY_OAUTH2_RESOURCESERVER_JWT_JWK_SET_URI` (compose). KHÔNG khai báo `jwk-set-uri` rỗng trong yml.
- Bí mật không ghi trong repo: `backend/.env` (chạy trên máy, backend tự đọc qua `spring.config.import`), `.env` cạnh `docker-compose.yml`, `frontend/.env.local`; mẫu ở `*.env.example`. `application.yml` chỉ có `${KSVB_DB_PASSWORD}`. Mọi biến cấu hình mang tiền tố `KSVB_` (không còn tên cũ không tiền tố); không dùng `DB_*` của máy dev (đó là của dịch vụ khác).
- Schema do **Flyway** quản lý: `backend/src/main/resources/db/migration` (`V1__init.sql`, `V2__audit_result_outbox.sql`, `V3__auditable_columns.sql`). Thay đổi schema = thêm `V4__...sql`, KHÔNG sửa file đã áp dụng. `ddl-auto=validate`. Chỉ hỗ trợ PostgreSQL (V3 có trigger plpgsql).

## Quyền & vai trò
- Quyền = client role của `ksvb-api`, kiểm bằng `@PreAuthorize("hasAuthority('...')")`, danh sách ở `shared/security/Permissions.java` (quyền mới phải thêm vào `ALL`, vào `docs/keycloak/setup-ksvb.sh` và tạo trong Keycloak). Role tổng hợp `role.user|leader|admin`: `docs/PHAN_QUYEN.md`.
- `/api/me` trả `permissions[]`; frontend ẩn/hiện menu/nút theo `can(quyền)` (`shared/auth/session.tsx`), backend luôn kiểm lại.
- Người dùng: `UserProvisioningService` tạo `app_user` ở lần đăng nhập đầu từ claim (`email`, `name`, `employee_code`, `unit_name`|`unit_code`, `position_name`|`position_code`) và cập nhật các lần sau; KSVB không đọc `hrm_db`. Chưa làm: lấy tên đơn vị từ API HRM (service account `client_credentials` có `*.view`, audience `hrm-api`).

## Quy ước backend
- Luật nghiệp vụ nằm ở entity domain (`signrequest/domain/SignRequest`: `SEQ` tuần tự / `PAR` song song, hoàn thành khi mọi người đã ký, từ chối/huỷ cần lý do, huỷ/thu hồi chỉ người tạo khi chưa ai ký, trình ký cần ≥1 người ký và ≥1 PDF); test thuần ở `*/domain/*Test`. Service tải dữ liệu, gọi luật, lưu, ghi audit + outbox.
- Lỗi (ECOSYSTEM.md 12.2, 12.7, giống HRM): RFC 7807 luôn có `code` (`ApiErrorCode`: `VALIDATION_ERROR|NOT_FOUND|FORBIDDEN|CONFLICT|BUSINESS_RULE|INTERNAL_ERROR`, suy từ HTTP), `reason` (mã chi tiết tuỳ chọn: `UNAUTHENTICATED`, `CONCURRENT_UPDATE`, `DATA_INTEGRITY`, hoặc `BusinessException.withReason(...)`), `errors[]` `{field,message}`. `BusinessException.businessRule` = 422, `invalid` = 400, `forbidden` 403, `notFound` 404, `conflict` 409. 401/403 ở filter: `shared/security/ProblemResponses` (`code=FORBIDDEN`, 401 thêm `reason=UNAUTHENTICATED`).
- Danh sách trả `shared/paging/PageResponse {content,page,size,totalElements,totalPages}` (`page` từ 0, `size` ≤ 100), không trả `Page` của Spring.
- Audit: bảng nghiệp vụ (`sign_request`, `sign_template`, `app_user`) kế thừa `shared/audit/Auditable` (`version_no` = khoá lạc quan, `created_at` DB sinh, `updated_at` + `version_no` do trigger `trg_touch_row`, `created_by/updated_by` = `CurrentUser.username()`). Nhật ký thao tác `audit_log`: `AuditService.log` (cùng transaction, `result=OK`), `logBlocked` (transaction riêng, `ERROR`; tự gọi từ `GlobalExceptionHandler` qua `BlockedActionAuditor` cho thao tác ghi bị chặn). Không ghi secret/nội dung tệp.
- Outbox: `shared/outbox/OutboxService.publish` (bắt buộc trong transaction) ghi `ksvb_outbox`; sự kiện văn bản ở `signrequest/application/SignRequestEvents`. Chưa có worker đẩy đi (ADR 0002).
- Số hiệu `HD-2026-0001` sinh từ bảng `doc_counter` có khoá ghi (`SELECT ... FOR UPDATE`), không sinh ở code.
- Tệp tải lên lưu ở `ksvb.storage.path` (`KSVB_STORAGE_PATH`), tên UUID do server sinh, kiểm đuôi + chữ ký `%PDF-`.
- Jackson 3 từ chối JSON thiếu trường `boolean` nguyên thuỷ trong record request → dùng `Boolean` cho cờ tuỳ chọn (vd. `SaveSignRequest.shared`). `@AutoConfigureMockMvc` ở `org.springframework.boot.webmvc.test.autoconfigure`; Jackson ở `tools.jackson.databind`.
- Chưa làm: gửi email thật (`LoggingNotificationService` chỉ ghi log), ký số PKI thật, ảnh chữ ký, phân quyền dữ liệu theo đơn vị, khoá phân tán cho job hết hạn, client gửi `versionNo` khi sửa.

## Quy ước frontend (`frontend/src`)
- Cấu trúc (ECOSYSTEM.md 12.3, 12.7): `app/` (`main.tsx`, `App.tsx` = route tải lười, `AppProviders.tsx` = QueryClient + SessionProvider + ConfigProvider/AntD App, `layout/` = Sider + Topbar + `nav.tsx`); `features/<f>/` (`dashboard`, `documents`, `compose`, `templates`, `reports`, `admin`, `profile`, `auth`: trang + `api.ts` = endpoint + hook useQuery); `shared/api` (`http.ts` fetch + token + `ApiError` đọc `code`/`reason`/`errors[]`, `queryClient.ts`, `types.ts` đặt tên kiểu, `schema.d.ts` sinh tự động), `shared/auth` (`keycloak.ts`, `session.tsx`, `permissions.ts`), `shared/theme`, `shared/ui`, `shared/format.ts`; `design/` (preview); `test/`.
- Đọc dữ liệu bằng TanStack Query (lỗi 4xx không thử lại); ghi xong gọi `useRefreshDocuments()` để làm mới danh sách/chi tiết/số việc chờ ký/dashboard. Thông báo qua `App.useApp().message`. Không tải dữ liệu bằng `useEffect`.
- Theme sáng/tối/theo hệ thống (`ksvb.theme`), màu chủ đạo `#1668dc`, mọi màu khác qua `theme.useToken()` / màu preset của Tag. Menu trái thu gọn (`ksvb.sidebar.collapsed`, phím `[`), dưới 1024px thành ngăn kéo. Trang giấy sơ đồ chữ ký (`features/documents/components/Paper.tsx`) luôn theme sáng.
- Không dùng `List` của AntD (deprecated từ 6.6) → `shared/ui/ItemList`; `Alert` dùng `title` (không `message`). Ô `<input type=file>` ẩn dùng `style={{display:'none'}}` (CSS AntD ghi đè `hidden`).
- Biến Vite: `VITE_KEYCLOAK_URL|REALM|CLIENT_ID`, `VITE_API_BASE_URL` (mặc định `/api`), `VITE_AUTH_DISABLED`, `VITE_DEV_USER_ID`, `VITE_PROXY_TARGET`, `VITE_HOST`, `VITE_ALLOWED_HOSTS`.
- Ưu tiên BE `NORMAL/HIGH/URGENT` → "Thường/Cao/Khẩn" (`PRIORITY_LABEL`).
- `openapi-typescript` khai peer TypeScript 5 nên `package.json` có `overrides`; TypeScript giữ 6.0 cho mọi app (12.7).

## Bản thiết kế
- `docs/design/index.html`: bản preview bấm thử toàn bộ frontend, **build từ code thật** (`npm run build:design`, một file mở trực tiếp được, dữ liệu mẫu trong bộ nhớ). Nút tròn góc dưới phải đổi quyền (`role.user|leader|admin`, chưa có quyền); mở thẳng một màn bằng `#/đường-dẫn` (vd. `index.html#/documents/101/sign`). KHÔNG sửa tay: sửa code/dữ liệu mẫu rồi build lại.

## Dữ liệu & việc cần tránh
- Chưa chạy trên Postgres/Keycloak thật của máy dev (chỉ Testcontainers). Không xoá dữ liệu DB thật khi chưa sao lưu.
- Không đổi gói `vn.vbi.ksvb`, không commit `.env*` (trừ `.env.example`), `node_modules`, `dist`, `backend/target`, `backend/config/` (cấu hình cục bộ có mật khẩu).
- Lịch sử git có mật khẩu DB cũ ghi cứng (commit `794beca`): nên đổi mật khẩu đó.

## Lỗi hay gặp
- Menu/trang trống sau đổi quyền: đăng xuất rồi đăng nhập lại để token có role mới.
- Test backend lỗi kết nối Docker: Testcontainers cần Docker Desktop đang chạy.
- Build backend báo sai phiên bản Java: `JAVA_HOME` chưa trỏ JDK 25.
- Windows/Git Bash: cờ robocopy `/E` bị đổi thành đường dẫn → dùng `//E`. Quy tắc quyền của bot chặn `rm -rf` thư mục dự án và ghi file `.env*`: người dùng phải xoá tay.
- Remote `origin` = github XoaiND/ksvb_app, nhánh `main` (`origin/main [gone]` từ 15/11/2026): kiểm tra remote trước khi push.
