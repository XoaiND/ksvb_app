# Kiến trúc chuẩn cho mọi app

Trạng thái: **ĐÃ CHỐT** (người dùng duyệt 16/11/2026). Đây là nguồn chuẩn duy nhất về kiến trúc và công nghệ; `ECOSYSTEM.md` mục 12 chỉ trỏ về đây. Mọi app (hrm, ksvb, app mới) phải **giống hệt nhau**: chỉ được khác ở mục 7. Không có ngoại lệ, kể cả khi có ADR; muốn đổi thì sửa file này và đổi cho mọi app cùng lúc.

Kiểm tra tự động: `docs/kiem-tra-chuan.sh` (mục 10).

## 1. Tổng thể hệ sinh thái

```
                 Trình duyệt
                     │  OIDC (Authorization Code + PKCE)
     ┌───────────────┼────────────────────┐
     ▼               ▼                    ▼
 hrm-frontend    ksvb-frontend        Keycloak :8080 (realm dev)
 host :3000      host :3001           hrm-web/hrm-api, ksvb-web/ksvb-api
 (nginx :8080 trong container)             ▲ JWKS
     │ /api            │ /api              │
     ▼                 ▼                   │
 hrm-backend :8081  ksvb-backend :8082 ────┘
     │                 │
     ▼                 ▼
 Postgres :5432 ── DB hrm_db  │  DB ksvb   (mỗi app DB + role riêng, không truy vấn chéo)

 HRM = nguồn gốc nhân sự → outbox → đồng bộ user sang Keycloak
 App khác lấy nhân sự từ claim token (employee_code, unit_code, position_code) hoặc API HRM
```
Sơ đồ chi tiết: `docs/kien-truc-tong-the.md` / `.svg`.

## 2. Cấu trúc repo

```
<app>_app/
├── backend/                     Java 25 + Spring Boot 4.1.2, Maven Wrapper
├── frontend/                    React 19 + TS 6.0 + Vite 8 + Ant Design 6
├── docs/                        bộ tài liệu cố định (mục 8)
├── .github/workflows/ci.yml     + .github/dependabot.yml (maven, npm, docker, github-actions)
├── docker-compose.yml           <app>-backend + <app>-frontend, network ngoài local-network
├── .env.example  .gitignore  README.md  CLAUDE.md
```
Không có thư mục nào khác ở gốc repo.

## 3. Backend

```
backend/
├── mvnw  mvnw.cmd  .mvn/  pom.xml  Dockerfile  .dockerignore  .gitignore  .env.example
├── db/setup-postgres.sql        tạo DB + role + schema của app (người dùng chạy tay)
└── src/
    ├── main/java/<gói gốc>/
    │   ├── <App>Application.java
    │   ├── <feature>/
    │   │   ├── api/          Controller mỏng, @PreAuthorize, nhận/trả DTO
    │   │   ├── application/  Service (@Transactional) + DTO record; gọi audit/outbox
    │   │   ├── domain/       Entity + luật nghiệp vụ, KHÔNG phụ thuộc Spring
    │   │   └── infra/        Repository, client hệ thống ngoài, loader dữ liệu mẫu (nếu có)
    │   ├── shared/
    │   │   ├── error/        ApiErrorCode, GlobalExceptionHandler, ProblemResponses,
    │   │   │                 BusinessException, ConflictException, NotFoundException
    │   │   ├── paging/       PageResponse
    │   │   ├── persistence/  Versions (khoá lạc quan)
    │   │   ├── security/     Permissions (+ALL), SecurityConfig, JWT → quyền, CurrentUser,
    │   │   │                 DevUserFilter + DevUserResolver (chế độ dev; mỗi app cài resolver ở <feature>/infra)
    │   │   ├── audit/        Auditable, AuditLog, AuditService, BlockedActionAuditor
    │   │   └── outbox/       OutboxEvent, OutboxRepository, OutboxService
    │   └── config/           <App>Properties, OpenApiConfig (đúng hai file này)
    ├── main/resources/
    │   ├── application.yml  application-prod.yml
    │   └── db/migration/V<n>__<tên>.sql
    └── test/java/<gói gốc>/            test nằm CÙNG GÓI với lớp được test (không có gói it/)
        ├── ArchitectureTest.java        ArchUnit (cùng một bộ luật ở mọi app)
        ├── PostgresIntegrationTest.java lớp nền Testcontainers (@ServiceConnection), profile test `it`
        ├── OpenApiExportTest.java       xuất frontend/openapi/openapi.json
        ├── config/                      test profile `prod` cấm khởi động khi tắt bảo mật
        ├── shared/security/             test chế độ JWT: 401 không token, 403 thiếu quyền, @PreAuthorize
        └── <feature>/{api,application,domain,infra}/...
```

**Chiều phụ thuộc** (ArchUnit chặn nếu sai):
```
api ──► application ──► domain ◄── infra
 └──────────┴──────────────┴──────────┴──► shared
```
`domain` không import Spring (trừ JPA/Jakarta annotation). Controller không trả entity.

**Luồng một request:**
```
HTTP → JWT (Keycloak, aud=<app>-api) → Controller @PreAuthorize("hasAuthority('x.y')")
     → Service @Transactional → Entity.luậtNghiệpVụ() → Repository
     → AuditService.record() + OutboxService.publish()   (cùng transaction)
     ← DTO / PageResponse  |  lỗi → ProblemDetail {code, detail tiếng Việt, errors[], reason}
```

### 3.1 Quy ước bắt buộc
| Mảng | Chuẩn |
|---|---|
| Mã lỗi (`code`) | `VALIDATION_ERROR` 400, `UNAUTHORIZED` 401, `FORBIDDEN` 403, `NOT_FOUND` 404, `CONFLICT` 409, `BUSINESS_RULE` 422, `INTERNAL_ERROR` 500 |
| ProblemDetail | `application/problem+json`, `detail` tiếng Việt, `code` luôn có, `errors[]` = `{field, message}` cho lỗi dữ liệu, `reason` (mã nghiệp vụ chi tiết, tuỳ chọn) |
| Exception | `BusinessException` (422, có `reason`), `ConflictException` (409), `NotFoundException` (404); không ném `ResponseStatusException` |
| JSON | **trả cả trường `null`** (không đặt `default-property-inclusion: non_null`); ngày giờ ISO-8601 |
| Phân trang | `PageResponse {content, page, size, totalElements, totalPages}`; `page` từ 0, `size` tối đa 100 |
| Khoá lạc quan | `version_no`; client gửi `versionNo` khi sửa; lệch → 409 `CONFLICT` |
| Audit | cột `created_at/created_by/updated_at/updated_by/version_no` (lớp `Auditable` + trigger `trg_touch_row`) **và** bảng `audit_log` ghi mọi thao tác ghi, kể cả bị chặn; không ghi secret |
| Outbox | `<app>_outbox` ghi cùng transaction; worker tuỳ nghiệp vụ |
| Quyền | client role `<app>-api` dạng `<đối tượng>.<hành động>`; role tổng hợp `role.*`; khai báo trong `Permissions.java` (+`ALL`) và `docs/keycloak/setup-<app>.sh` |
| Mã nghiệp vụ | do DB cấp (sequence / bảng counter có khoá ghi) |
| Schema | Flyway, `ddl-auto=validate`, không sửa migration đã áp dụng; **không H2** |
| Cấu hình | mọi biến môi trường có tiền tố `<APP>_`, không đọc tên cũ; secret không có giá trị mặc định; profile chỉ `prod` (mặc định = dev), `it` cho test; `prod` không khởi động nếu tắt bảo mật |

## 4. Frontend

```
frontend/
├── package.json (engines node 24)  package-lock.json  tsconfig.json
├── vite.config.ts  vite.design.config.ts  playwright.config.ts
├── eslint.config.js  .prettierrc.json  .prettierignore
├── Dockerfile  .dockerignore  .env.example
├── index.html
├── nginx/          default.conf: nghe 8080, /healthz, proxy /api → backend
├── openapi/openapi.json            đặc tả xuất từ OpenApiExportTest, CI kiểm lệch
├── design/         entry HTML của bản preview (build ra docs/design/)
├── e2e/            Playwright, chạy trên backend giả (không cần backend thật)
└── src/
    ├── app/
    │   ├── main.tsx  AppProviders.tsx (QueryClient, ThemeProvider, auth)
    │   ├── App.tsx       vỏ chung: provider, router, guard đăng nhập/quyền — giống hệt ở mọi app
    │   ├── routes.tsx    RIÊNG app: danh sách route + quyền cần có
    │   ├── nav.tsx       RIÊNG app: menu, brand, slot riêng của Topbar (vd. số việc chờ)
    │   ├── pages/        trang của khung: đăng nhập, lỗi quyền, không tìm thấy
    │   └── layout/       AppLayout.tsx  SideMenu.tsx  Topbar.tsx — giống hệt ở mọi app, nhận cấu hình từ nav.tsx
    ├── features/<feature>/        gốc feature CHỈ có các mục sau:
    │   ├── pages/                 bắt buộc
    │   ├── components/            khi cần
    │   ├── lib/                   hàm thuần riêng của feature + test (vd. username.ts, iam.ts)
    │   ├── hooks.ts               mọi useQuery/useMutation (TanStack Query) của feature
    │   └── api.ts                 gọi qua shared/api/http.ts (+ api.test.ts nếu có)
    ├── shared/
    │   ├── api/      http.ts (fetch + token + ApiError{status, code, detail, errors, reason, body}),
    │   │             schema.d.ts (openapi-typescript), queryClient.ts
    │   ├── auth/     keycloak.ts (keycloak-js, PKCE), session.tsx (SessionProvider, useSession, can(quyền)),
    │   │             permissions.ts (+ .test.ts): danh sách quyền riêng của app — file duy nhất trong shared/ được khác nhau
    │   ├── lib/      format.ts (định dạng ngày, số, dung lượng...) và hàm thuần dùng chung
    │   ├── theme/    ThemeProvider.tsx: sáng/tối/theo hệ thống, colorPrimary #1668dc, màu qua theme.useToken()
    │   └── ui/       PageHeader  PageState  StatusTag  PersonAvatar  ThemeSwitch (bộ chung, mục 7.1)
    ├── design/       demoBackend.ts (RIÊNG app: dữ liệu mẫu cho backend giả, dùng chung cho preview, test giao diện, E2E), main.tsx
    └── test/         setup.ts, fakeFetch.ts (cơ chế backend giả: giống hệt ở mọi app)
```
- `package.json`: cùng danh sách thư viện và **cùng chuỗi phiên bản** ở hai app (lấy bản cao hơn khi lệch), `engines.node` = `>=24 <25`.
- `shared/` (BE và FE) giống hệt nhau từng file, trừ `shared/security/Permissions.java` và `shared/auth/permissions*.ts`. Truy vấn/logic riêng của một tính năng (vd. truy vấn outbox cho màn Đồng bộ của hrm) đặt ở `<feature>/infra`, không thêm vào `shared/`.
- Script `package.json` cố định: `dev build preview test e2e lint gen:api format format:check build:design`.
- Biến Vite: `VITE_API_BASE_URL`, `VITE_KEYCLOAK_URL|REALM|CLIENT_ID`, `VITE_AUTH_DISABLED`, `VITE_DEV_USER_ID`.
- Không tải dữ liệu bằng `useEffect`; không ghi cứng màu (trừ token theme); thông điệp tiếng Việt.
- Giao diện khung: menu trái thu gọn (phím `[`), dưới 1024px thành ngăn kéo.

## 5. Công nghệ cố định

| Tầng | Công nghệ |
|---|---|
| Backend | Java 25, Spring Boot 4.1.2, Maven Wrapper (Maven 3.9.11), JPA/Hibernate 7, Jackson 3, springdoc 3.1.0 |
| DB | PostgreSQL, Flyway |
| Bảo mật | Spring Security OAuth2 Resource Server + Keycloak |
| Frontend | React 19, TypeScript 6.0, Vite 8, `react-router` 7, Ant Design 6, TanStack Query 5, **`fetch`** (không axios), keycloak-js 26 |
| Kiểu API | `openapi-typescript` |
| Test | JUnit 5 + Mockito, ArchUnit, Testcontainers (`@ServiceConnection`, PostgreSQL 17); Vitest 5; Playwright |
| Chất lượng | Spotless; ESLint (flat config) + Prettier; CI GitHub Actions (`actions/*` v5); Dependabot; `npm audit --audit-level=high` |
| Vận hành | Actuator (liveness/readiness), Micrometer Prometheus (`/actuator/prometheus`, cần `system.monitor`), OpenTelemetry OTLP (tắt mặc định), log ECS JSON có traceId ở `prod`; Swagger tắt ở `prod` |
| Docker | BE `eclipse-temurin:25-jre`, uid 10001, thư mục dữ liệu ghi được `/app/data` (app tự tạo thư mục con, vd. ksvb `/app/data/upload`), HEALTHCHECK qua `/dev/tcp`; FE `nginxinc/nginx-unprivileged`, nghe 8080, HEALTHCHECK `/healthz`; build bằng Node 24 |

## 6. CI (`.github/workflows/ci.yml`)
Job `backend`: `./mvnw spotless:check verify` + kiểm lệch đặc tả OpenAPI. Job `frontend`: `npm ci`, lint, `gen:api` không lệch, `format:check`, build, test, `npm audit`. Job `e2e`: build preview rồi chạy Playwright. CI xanh mới merge.

## 7. Hai app chỉ được khác nhau ở
- Tên app và tiền tố: `hrm`/`HRM_`, `ksvb`/`KSVB_` (kể cả tên lớp `<App>Properties`, `<App>Application`).
- Gói gốc = tên app: `hrm` / `ksvb` (thư mục `src/{main,test}/java/<app>/`); `groupId` Maven = `<app>`, `artifactId` = `<app>-backend`. Không dùng tiền tố tên miền (dự án cá nhân, không đóng gói thư viện cho bên khác).
- Cổng host: hrm 8081/5173/3000, ksvb 8082/5174/3001.
- Danh sách tính năng (`<feature>/`), migration nghiệp vụ, tài liệu nghiệp vụ, và thành phần riêng của tính năng (vd. `iam_audit`, `KeycloakSyncWorker` của hrm; lưu tệp PDF và `DemoDataLoader` của ksvb). Thành phần riêng luôn nằm trong thư mục của tính năng, không nằm ở `config/` hay `shared/`.

### 7.1 Danh sách cố định (`kiem-tra-chuan.sh` kiểm từng mục)
| Mục | Quy định |
|---|---|
| Gốc `backend/` (file git, trừ `src/`) | `.dockerignore .env.example .gitignore .mvn/wrapper/maven-wrapper.properties Dockerfile db/setup-postgres.sql mvnw mvnw.cmd pom.xml` |
| Gốc `frontend/` (file git, trừ `src/`) | `.dockerignore .env.example .gitignore .prettierignore .prettierrc.json Dockerfile design/ e2e/ eslint.config.js index.html knip.json nginx/default.conf openapi/openapi.json package.json package-lock.json playwright.config.ts tsconfig.json vite.config.ts vite.design.config.ts` |
| BE `config/` | `<App>Properties.java`, `OpenApiConfig.java` — không có file khác |
| BE `shared/` | `error audit outbox paging persistence security` giống hệt từng file, trừ `Permissions.java`. Mở rộng riêng được phép (ghi ở đây, nằm ngoài so sánh): hrm `text/VietnameseText`, `domain/Status` |
| BE test chung | `ArchitectureTest`, `OpenApiExportTest` (chỉ kiểm chung: `"openapi"` và `/api/me`), `PostgresIntegrationTest`, `config/ProdSecurityGuardTest`, `config/ApiDocsProfileTest` giống hệt (so sau khi sắp xếp import, vì thứ tự import theo tên gói); `src/test/resources/application-it.yml` so theo quy tắc `application*.yml` (khoá riêng của app được khác); mỗi app còn có test `shared/security/` (JWT: 401/403) viết theo endpoint của mình |
| Dockerfile backend | giống hệt; thư mục dữ liệu `/app/data` thuộc uid 10001, app tự tạo thư mục con lúc chạy (vd. ksvb `/app/data/upload`); compose gắn volume vào `/app/data`, không vào thư mục con |
| `pom.xml` | giống hệt trừ thư viện riêng được phép: hrm `spring-boot-starter-restclient`. Thư viện test chung: `webmvc-test`, `security-test` (không khai báo thư viện test mà không dùng) |
| Tên biến cấu hình chung | `<APP>_OIDC_ISSUER_URI` (mặc định `https://sso.xoaind.io.vn/realms/dev` = `iss` thật của token), `<APP>_OIDC_JWK_SET_URI` (mặc định `http://localhost:8080/realms/dev/protocol/openid-connect/certs`; compose Docker ghi đè `http://keycloak:8080/...`), `<APP>_DB_*`, `<APP>_SECURITY_ENABLED`, `<APP>_API_DOCS_ENABLED`, `<APP>_CORS_ORIGINS` |
| Hợp đồng chung | `shared/security`: `DevUserResolver.resolve(String userIdHeader) → Optional<DevUser(username, authorities)>` (header sai → `IllegalArgumentException` → 400); `SecurityConfig.filterChain(HttpSecurity, props, DevUserResolver, Environment)`. FE: `app/nav.tsx` xuất `APP_ID BRAND NAV USER_MENU FALLBACK_HOME TopbarStart TopbarEnd userDisplayName(me) userAvatarId(me) useNavBadges()` (`useNavBadges` trả `Record<đường dẫn menu, số>` để hiện huy hiệu, app không cần thì trả `{}`; mục menu có `children` và đường dẫn kèm query được hỗ trợ); `app/routes.tsx` xuất `ROUTES`, mỗi route có `component` tải lười (`lazy`, `App.tsx` bọc `Suspense`) và `perm` là một quyền **hoặc mảng quyền (có một là đủ)**; thiếu quyền → `App.tsx` hiện `app/pages/ForbiddenPage`, đường dẫn lạ → `NotFoundPage` (hai trang này giống hệt ở mọi app; không có `LoginPage`: đăng nhập chuyển sang Keycloak, chế độ `VITE_AUTH_DISABLED` không cần trang đăng nhập); `design/demoBackend.ts` xuất `demoReply(method, path, perms, query?, body?)`; `test/fakeFetch.ts` khớp đường dẫn có tham số `:id`, truyền `query`/`body` cho `demoReply` và xuất kiểu `Call`, `Route`. `OpenApiConfig`: xác định record request theo schema được dùng làm requestBody (không theo tên lớp) |
| FE `shared/` | chỉ thư mục `api auth lib theme ui`, không có file lẻ. `api/{http.ts,http.test.ts,query.ts,queryClient.ts,types.ts,schema.d.ts}` (`query.ts` = `useApiQuery`/`useApiMutation`, mọi `hooks.ts` dùng chúng); `auth/{keycloak.ts,session.tsx,permissions.ts}`; `lib/format.ts`; `ui/` = bộ chung ở sơ đồ trên. Mọi file giống hệt trừ `types.ts`, `schema.d.ts`, `permissions*.ts` |
| FE `app/` | gốc `src/app/` chỉ có `main.tsx AppProviders.tsx App.tsx App.test.tsx routes.tsx nav.tsx` (+ `layout/`, `pages/`); giống hệt: `main.tsx AppProviders.tsx App.tsx layout/*`; riêng app: `routes.tsx nav.tsx App.test.tsx`; `pages/{ForbiddenPage,NotFoundPage}.tsx` giống hệt |
| FE `test/` | `setup.ts` và `fakeFetch.ts` giống hệt; dữ liệu mẫu chỉ nằm ở `design/demoBackend.ts` |
| Tên tính năng chung | `me` (hồ sơ người dùng hiện tại), `dashboard` — cùng tên ở BE và FE ở mọi app có chức năng đó |
| Gốc feature FE | chỉ `pages/ components/ lib/ hooks.ts api.ts api.test.ts`; mỗi feature có `pages/` |
| `application*.yml` | cùng cấu trúc khoá và cùng giá trị mặc định, trừ khoá riêng của app (`<app>.*`, `spring.servlet.multipart`, `spring.flyway.baseline-*`) |
| ADR | quyết định chung của mọi app nằm ở ADR hệ sinh thái (`docs/adr/` cạnh file này); app chỉ giữ ADR riêng của mình; thư mục `docs/adr/` của app không bắt buộc |

## 8. Tài liệu của mỗi app
```
README.md          Giới thiệu · Chạy nhanh · Cấu hình (biến môi trường) · API · Kiểm tra · Docker · Xử lý sự cố
CLAUDE.md          Tổng quan · Cấu trúc · Lệnh · Hạ tầng · Quyền · Quy ước backend · Quy ước frontend · Chỗ dễ sai
docs/
├── kien-truc-chuan.md    bản chép NGUYÊN VĂN của docs/kien-truc-chuan.md ở cấp hệ sinh thái (sửa chuẩn thì chép lại cho mọi app)
├── kien-truc.md          theo mẫu docs/mau-app/kien-truc.md (ở cấp hệ sinh thái), điền tính năng thật
├── requirements.md       chức năng theo code
├── business-rules.md     luật nghiệp vụ, trạng thái
├── database.md           ERD, bảng, migration
├── phan-quyen.md         quyền, role tổng hợp, cách tạo trong Keycloak
├── adr/NNNN-<tên>.md     (không bắt buộc) quyết định thiết kế RIÊNG của app; quyết định chung xem docs/adr của hệ sinh thái
├── design/               preview giao diện build từ code (npm run build:design)
└── keycloak/setup-<app>.sh
```
Tài liệu riêng của tính năng lớn được thêm (vd. HRM có tài liệu IAM riêng), không thay các file trên. Mọi tài liệu viết theo code hiện tại; đổi code thì sửa tài liệu cùng commit.

## 9. Không có file thừa
Repo chỉ chứa thứ đang dùng. Cấm:
- Mã chết: lớp/hàm/component/export không ai dùng, code bị comment cả khối, file cũ đã thay thế, thư mục rỗng.
- Thư viện khai báo mà không dùng (`npm`: kiểm bằng `knip`; Maven: `dependency:analyze`).
- Bản cũ, bản song song không dùng (vd. backend .NET cũ), script chạy một lần đã xong, dữ liệu thử nghiệm.
- Tài liệu trỏ tới thứ không còn, tài liệu trùng nội dung, ghi chú bàn giao tạm.
- Kết quả build/chạy bị commit: `dist/`, `target/`, `node_modules/`, `test-results/`, `playwright-report/`, `*.tsbuildinfo`, `.idea/`, `.env`, `.env.local` (đều phải có trong `.gitignore`).

## 10. Kiểm tra tuân thủ
`bash docs/kiem-tra-chuan.sh` (ở thư mục hệ sinh thái): thay tên app/gói/cổng bằng chỗ giữ rồi so các file hạ tầng giữa hai repo, và kiểm các luật ở mục 3–9. Kết quả đạt = không còn khác biệt ngoài mục 7 và không vi phạm luật nào. Mỗi app còn phải: `./mvnw spotless:check verify`, FE `lint format:check build test e2e`, `npm audit`, build + chạy Docker `healthy`.
