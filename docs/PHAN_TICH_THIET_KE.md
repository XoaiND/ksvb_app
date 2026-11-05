# Phân tích thiết kế — Hệ thống Ký số văn bản (KSVB)

> Stack mục tiêu: **Frontend React 18 + TypeScript**, **Backend Java Spring Boot 3 (Java 17+)**.
> Nghiệp vụ được rút ra từ bản .NET hiện có (`ksvb-be`) và FE React (`ksvb-fe`). Bản .NET chỉ là tham chiếu nghiệp vụ, không phải đích triển khai.
> Giả định: "công việc 95 và 103" không có trong ngữ cảnh nên chưa đối chiếu được; nếu là ticket cụ thể, cần bổ sung mục tương ứng.

## 1. Phạm vi & vai trò
- Mục tiêu: người tạo trình văn bản (PDF/Office/ảnh/zip) qua luồng ký nhiều cấp; người ký ký/từ chối; theo dõi, lưu trữ, báo cáo SLA.
- Vai trò nghiệp vụ (`ParticipantRole`): `SIGNER` (ký), `APPROVER` (phê duyệt), `REVIEWER` (xem xét/góp ý), `NOTIFIER` (nhận thông báo), `OBSERVER` (xem). Ngoài ra có người theo dõi (Watcher) gắn ở mức văn bản.
- Vai trò hệ thống (`RoleType`): Default, Leadership (Lãnh đạo ban), Executive (Ban điều hành), Administrator.
- Quyền chức năng: READ, WRITE, DELETE, APPROVE, SIGN, ADMIN; quyền dữ liệu theo tổ chức (Access Control).

## 2. Menu chức năng
| # | Menu | Route | Điều kiện hiển thị |
|---|------|-------|--------------------|
| 1 | Dashboard | `/dashboard` | mọi user đã có đủ org/dept/pos/div |
| 2 | Trình ký | `/sign` | ẩn trên mobile (≤640px) |
| 3 | Lưu trữ tài liệu | `/document` | mọi user |
| 4 | Phân quyền dữ liệu | `/access-control` | `canViewAccessControlPage` |
| 5 | Báo cáo SLA | — | có ít nhất 1 con |
| 5.1 | Ban lãnh đạo | `/report-management` | `canViewReportManagementPage` |
| 5.2 | Lãnh đạo Ban/Đơn vị | `/report-for-bod` | `canViewReportForBodPage` |
| 6 | Quản trị hệ thống | — | quyền ADMIN (nên dùng quyền thay vì danh sách email cứng như bản cũ) |
| 6.1 | Tách nền chữ ký | `/signature-background-removal` | ADMIN |
| 6.2 | Quản lý văn bản huỷ | `/sign-request-delete` | ADMIN |
| 6.3 | Đồng bộ tài khoản | `/integration-logs` | ADMIN |
| 6.4 | Lịch sử gửi email | `/email-logs` | ADMIN |
| 6.5 | Migrate số hiệu văn bản | `/migrate-document-number` | ADMIN (chức năng tạm, bỏ sau khi chuyển đổi) |
| 7 | Hướng dẫn sử dụng | mở PDF tĩnh | mọi user |
| — | Menu người dùng (góc phải) | `/user` | Thông tin người dùng (hồ sơ, ảnh chữ ký), Đăng xuất |

Trang ngoài menu: `/login`, `/external-login` (SSO/tích hợp), `/auth-token`, `/preview/:id`, `/detail/:id`, `/document/:id`, `/forbidden`.
Menu nên được server trả về theo quyền (`GET /api/me/menu`) thay vì hard-code ở FE.

## 3. Thiết kế giao diện chi tiết

### 3.1 Khung chung
- Layout: menu trái (thu gọn được), header trên có logo + dropdown người dùng; mobile dùng drawer. UI: MUI + Tailwind, react-query cho dữ liệu, formik/react-hook-form + yup cho form.
- Guard route: chưa đăng nhập → `/login`; không đủ quyền → `/forbidden`.

### 3.2 Đăng nhập
- Form tài khoản (hoặc SSO Keycloak/OIDC), nhận JWT; lưu token, tự refresh. `/external-login` nhận token từ hệ thống ngoài.

### 3.3 Dashboard
- Thẻ thống kê: Chờ tôi ký, Tôi đã trình, Hoàn thành, Từ chối/Huỷ, Sắp hết hạn.
- Biểu đồ tròn theo trạng thái, cột theo tháng/loại văn bản; card hồ sơ người dùng; danh sách "việc cần xử lý" bấm vào sang chi tiết.

### 3.4 Trình ký (`/sign`)
```
[Tab: Chờ tôi ký | Tôi đã trình | Chung(theo quyền dữ liệu)]   [+ Tạo trình ký]
[Lọc: từ khoá | loại VB | trạng thái | ngày trình | hạn ký]
| Số hiệu | Tiêu đề | Loại | Người tạo | Ngày trình | Hạn | Trạng thái | Thao tác |
                                                  phân trang (server-side)
```
- Tạo/sửa (Draft) là wizard 3 bước:
  1. **Thông tin**: tiêu đề (≤250), loại văn bản (`DocType`), đơn vị (OrgId), mô tả (≤500), hạn ký, link chia sẻ, người theo dõi.
  2. **Tệp đính kèm**: kéo-thả (PDF/DOC(X)/XLS(X)/PNG/ZIP/RAR), chọn tệp chính cần ký.
  3. **Luồng ký**: thêm người tham gia, gán vai trò, cấp ký, cờ "ký bằng ảnh chữ ký"; hiển thị sơ đồ các nhóm theo cấp.
- Nút: Lưu nháp, Xem trước, Trình ký.
- **Xem trước** (`/preview/:id`): viewer PDF (pdf.js), đặt/kéo-thả vị trí chữ ký (re-resizable, react-draggable).
- **Chi tiết** (`/detail/:id`): thông tin chung, viewer, timeline luồng ký (từng người + trạng thái + thời điểm + ghi chú), bình luận, lịch sử.
- Hành động theo ngữ cảnh: **Ký** (popup xác nhận, ghi chú), **Từ chối** (bắt buộc lý do), **Huỷ** (chỉ người tạo; bắt buộc lý do), **Tái tạo từ văn bản huỷ/từ chối**.

### 3.5 Lưu trữ tài liệu (`/document`, `/document/:id`)
- Danh sách văn bản đã hoàn thành/đã xử lý có tìm kiếm nâng cao; chi tiết có thông tin, tệp (tải xuống, tải gói), bình luận (`DocumentComment`), modal Huỷ/Xoá/Lịch sử xoá.

### 3.6 Phân quyền dữ liệu (`/access-control`)
- Chọn người dùng → gán danh sách đơn vị được xem; bảng quyền theo vai trò; lưu theo lô.

### 3.7 Báo cáo SLA
- Tab Tổng quan / Theo loại văn bản / Cá nhân; biểu đồ top đúng hạn, top trễ, top người tạo hoàn thành/huỷ; xuất Excel.
- Đánh giá SLA: >97% Xuất sắc; 90–96.9% Đạt; 80–89.9% Cần cải thiện; 70–79.9% Thấp; <70% Yếu. Gợi ý theo số cấp ký TB: ≤5 tốt; 6–12 xem xét rút gọn; >12 rà soát ủy quyền/gom bước.

### 3.8 Quản trị hệ thống
- Tách nền chữ ký: tải ảnh, xử lý nền trong suốt, xem trước, lưu log.
- Quản lý văn bản huỷ: danh sách, chọn nhiều → xoá mềm; lịch sử xoá; khôi phục.
- Đồng bộ tài khoản: log tích hợp Tổ chức / Chức danh / Nhân sự (HRM), lọc theo thời gian/kết quả, xem payload.
- Lịch sử email: danh sách, xem nội dung email đã gửi.
- Migrate số hiệu: chạy/undo/xem tiến độ (tạm thời).

### 3.9 Thông tin người dùng (`/user`)
- Hồ sơ (đồng bộ từ HRM, chỉ đọc), ảnh đại diện, **tải ảnh chữ ký** (kèm hướng dẫn chuẩn ảnh), xem trước kết quả tách nền.

## 4. Mô hình dữ liệu (JPA)
- `SignRequest`(id, title, typeId, description, orgId, status, parallelSign, createdBy/At, updatedBy/At, cancellationReason, expirationDate, documentNumber, oldRequestId, urlShare, submitDate, completedDate)
- `Participant`(id, requestId, userId, level, levelParallel, isSignImage, role, note, status, signedAt, audit)
- `Watcher`, `SignRequestComment`, `SignRequestSnapshot`, `Attachment`(objectId, tên, đường dẫn, kích thước, loại)
- `DocType`(code, tên, trạng thái), `Organization`(cây cha-con, type, level), `Position`(posGroup, level, hrmPosCode), `User`(org/dept/div/pos, trạng thái)
- `Role`, `Permission`, `RolePermission`, `UserRole`, `Menu`, `AccessControl`, `AccessControlOrganization`, `SystemConfig`
- Log: `IntegrationLog`, `EmailLog`, `ApplicationLog`, `SignatureBackgroundRemovalLog`.
- Nên dùng Flyway; khoá chính UUID; audit bằng `@CreatedBy/@LastModifiedDate`; xoá mềm cho văn bản.

## 5. Luồng xử lý

### 5.1 Máy trạng thái văn bản (`SignRequest.status`)
```
DRAFT --submit--> PENDING --tất cả nhóm ký xong--> COMPLETED
PENDING --một người từ chối--> REJECTED
PENDING --người tạo huỷ (chưa ai ký/từ chối)--> CANCELLED
PENDING --quá hạn--> EXPIRED
REJECTED / CANCELLED --tái tạo (oldRequestId)--> DRAFT mới
```
Trạng thái participant: `NOT_REQUIRED` (chưa đến lượt) → `PENDING` (đang đến lượt) → `SIGNED` | `REJECTED` | `SKIPPED` | `CANCELLED`.

### 5.2 Tạo & trình ký
1. `POST /api/sign-requests` tạo DRAFT (kèm participants với status `NOT_REQUIRED`, watchers, attachments). `levelParallel` lấy từ `Position.posGroup` của người ký (mặc định 1).
2. `PUT /api/sign-requests/{id}` sửa khi còn DRAFT.
3. `POST /api/sign-requests/{id}/submit`: kiểm tra DRAFT; validate luồng (có người ký, mỗi nhóm có giá trị `levelParallel`); đặt PENDING, `submitDate`; **sinh số hiệu**; kích hoạt người ký đầu: nếu người tạo cũng nằm trong luồng thì người tạo ký trước, ngược lại kích hoạt nhóm có `levelParallel` nhỏ nhất (status → PENDING); gửi email phê duyệt cho nhóm đó và email thông báo cho reviewer/watcher (lỗi gửi mail không làm hỏng giao dịch).

### 5.3 Sinh số hiệu
- Dạng `{MãLoạiVB}-{...}`; văn bản tái tạo từ bản huỷ/từ chối lấy số gốc + hậu tố `.n` (n = max hậu tố hiện có + 1). Cần khoá (hoặc sequence) để tránh trùng khi trình đồng thời.

### 5.4 Ký
1. `POST /api/sign-requests/{id}/sign` (userId lấy từ token, không tin client).
2. Kiểm tra: văn bản phải PENDING; user là participant; participant phải PENDING (nếu chưa đến lượt → báo "quy trình đang ở bước trước").
3. Đặt SIGNED, `signedAt`, note. Nếu `isSignImage` → chèn ảnh chữ ký (đã tách nền) lên PDF tại vị trí đã đặt.
4. Nếu người ký là người tạo: kích hoạt nhóm nhỏ nhất của những người còn lại.
5. Ngược lại: nếu cả nhóm cùng `levelParallel` đã SIGNED → kích hoạt nhóm có `levelParallel` lớn hơn nhỏ nhất kế tiếp; nếu không còn nhóm nào → COMPLETED, ghi `completedDate`, gửi email hoàn thành.
6. Trong cùng nhóm mọi người ký song song; giữa các nhóm ký tuần tự.

### 5.5 Từ chối
- Participant phải PENDING; bắt buộc lý do; participant → REJECTED, văn bản → REJECTED (dừng luồng); email cho người tạo và các bên liên quan.

### 5.6 Huỷ
- Chỉ người tạo; văn bản PENDING và chưa có ai SIGNED/REJECTED; bắt buộc lý do; văn bản và participant → CANCELLED; gửi email.

### 5.7 Hết hạn & nhắc việc
- Job định kỳ (`@Scheduled` + ShedLock): nhắc khi sắp hết hạn (template "about-expire"), chuyển EXPIRED khi quá `expirationDate`.

### 5.8 Xoá/khôi phục (Admin)
- Danh sách văn bản huỷ → xoá mềm hàng loạt, ghi lịch sử xoá, cho phép khôi phục.

### 5.9 Đồng bộ danh mục (HRM)
- Job/endpoint tích hợp đồng bộ Tổ chức → Chức danh → Nhân sự; mỗi lần chạy ghi `IntegrationLog` (request/response, kết quả). Tài khoản thiếu org/dept/pos/div thì không thấy menu.

### 5.10 Thông báo
- Template HTML: duyệt, xem xét, cập nhật, từ chối, huỷ, hoàn thành, sắp hết hạn, đã hết hạn. Gửi bất đồng bộ (`@Async` hoặc hàng đợi), ghi `EmailLog`.

## 6. Kiến trúc Spring Boot đề xuất
- Gói theo module: `auth`, `user`, `org`, `doctype`, `signrequest`, `participant`, `attachment`, `signing` (PDF), `notification`, `report`, `access`, `integration`, `admin`. Mỗi module: `web` (controller + DTO) → `service` → `repository` → `domain`; giữ chiều phụ thuộc một chiều, kiểm bằng ArchUnit.
- Công nghệ: Spring Web, Spring Security (OAuth2 Resource Server/JWT, Keycloak), Spring Data JPA + Flyway, MapStruct, Validation, Mail, Scheduler + ShedLock, OpenPDF/PDFBox cho chèn chữ ký ảnh (ký số PKI nếu cần: iText/BouncyCastle), Apache POI xuất báo cáo, springdoc-openapi, Micrometer.
- DB: giữ Oracle nếu chạy chung hạ tầng cũ, hoặc PostgreSQL; kiểu CLOB/phân trang cần kiểm khi chọn.
- Tệp: lưu object storage hoặc thư mục cấu hình; chống path traversal, giới hạn kích thước, kiểm MIME/đuôi tệp, quét virus nếu có.

### API chính (REST, tiền tố `/api`)
| Nhóm | Endpoint |
|------|----------|
| Auth | `POST /auth/login`, `POST /auth/refresh`, `GET /me`, `GET /me/menu` |
| Văn bản | `POST /sign-requests`, `PUT/GET/DELETE /sign-requests/{id}`, `POST /sign-requests/{id}/submit\|sign\|reject\|cancel` |
| Danh sách | `GET /sign-requests?scope=pending\|mine\|general&page&size&filter...` |
| Bình luận | `GET/POST /sign-requests/{id}/comments` |
| Tệp | `POST /attachments`, `GET /attachments/{id}/download` |
| Danh mục | `/doc-types`, `/organizations`, `/positions`, `/users` |
| Quyền | `/access-controls`, `/roles`, `/permissions` |
| Báo cáo | `/reports/management`, `/reports/bod`, `/dashboard` |
| Admin | `/admin/cancelled-requests` (+ `/restore`), `/admin/integration-logs`, `/admin/email-logs`, `/admin/signature-background-removal`, `/admin/document-number-migration` |
- Chuẩn lỗi RFC 7807 (`ProblemDetail`); phân trang `Page<T>`; xác thực người thao tác lấy từ JWT.

## 7. Phi chức năng
- Bảo mật: RBAC + kiểm quyền dữ liệu theo tổ chức ở tầng service; không cho client truyền `userId` của người ký; audit mọi thao tác ký/từ chối/huỷ.
- Toàn vẹn: giao dịch + khoá lạc quan (`@Version`) trên `SignRequest` để hai người cùng nhóm ký đồng thời không làm sai chuyển cấp.
- Hiệu năng: phân trang server-side, index theo (status, createdBy, orgId, submitDate), (requestId, userId).
- Quan sát: log JSON, correlation id; tương đương Serilog/ELK ở bản cũ.
- Triển khai: Docker (backend 8080, frontend nginx 80), cấu hình theo profile `dev|uat|prod`, bí mật qua biến môi trường.

## 8. Điểm lưu ý khi chuyển từ bản .NET
- Bản cũ có hai luồng (trước/sau golive 2026-02-10 16:30): luồng cũ tuần tự/song song theo `Level`, luồng mới "nhóm tuần tự – trong nhóm song song". Bản mới chỉ cần luồng mới; văn bản cũ cần migrate hoặc giữ chế độ chỉ đọc.
- Có các endpoint migrate/temp (`temp-delete`, `merge-data-doc-type`, `generate-orgId`) — không đưa sang bản mới.
- Quyền Quản trị bản cũ hard-code theo email; bản mới dùng role.
- Lỗi gửi email bị nuốt im lặng ở bản cũ; bản mới nên ghi log + cho phép gửi lại.

## 9. Việc cần chốt
- DB đích (Oracle hay PostgreSQL), SSO (Keycloak realm/client), có ký số PKI thật hay chỉ chèn ảnh chữ ký.
- Có giữ văn bản cũ trước golive không.
- Danh sách tiêu chí SLA chính thức (hạn xử lý theo loại văn bản).
