# Phân quyền KSVB

Theo code hiện tại: `ksvb-be/.../shared/security/Permissions.java` và `docs/keycloak/setup-ksvb.sh` (tạo đúng các quyền, role dưới đây).

Quyền chi tiết = client role của client `ksvb-api` trong Keycloak (realm `dev`), kiểm bằng `@PreAuthorize("hasAuthority('...')")`
(cách HRM đang làm). Role tổng hợp là composite role bên Keycloak; backend không kiểm tên role tổng hợp.

## Quyền chi tiết
| Quyền | Cho phép | API / menu |
|---|---|---|
| `document.create` | soạn, sửa nháp, tải tệp, trình ký, thu hồi, huỷ, nhắc ký, xoá nháp của mình | `POST/PUT/DELETE /api/sign-requests`, `.../attachments`, `.../submit`, `.../recall`, `.../cancel`, `.../remind`; menu Soạn tài liệu mới |
| `document.sign` | ký, từ chối khi đến lượt | `POST .../sign`, `.../reject` (backend không kiểm role của người được chọn vào luồng ký, chỉ kiểm khi họ ký) |
| `document.view.all` | xem mọi văn bản kể cả không liên quan | `GET /api/sign-requests/{id}`, tải tệp |
| `report.view` | báo cáo toàn hệ thống | `GET /api/reports/summary`; menu Báo cáo |
| `user.manage` | xem danh sách và bật/tắt tài khoản KSVB (gán role làm ở Keycloak) | `GET /api/admin/users`, `PATCH /api/admin/users/{id}` |
| `audit.view` | xem nhật ký thao tác | `GET /api/admin/audit-logs` |
| `config.manage` | cấu hình hệ thống | menu Quản trị → Cấu hình (backend chưa có) |
| `cert.manage` | quản lý chứng thư số | menu Quản trị → Chứng thư số (backend chưa có) |
| `system.monitor` | actuator | `/actuator/**` |

Không cần quyền riêng (mọi người đã đăng nhập): xem văn bản mình tạo / tham gia ký / theo dõi, tài liệu chung,
dashboard cá nhân, mẫu người nhận của mình, hồ sơ và chữ ký.

## Role tổng hợp
| Quyền | `role.user` | `role.leader` | `role.admin` |
|---|:-:|:-:|:-:|
| `document.create` | ✔ | ✔ | ✔ |
| `document.sign` | ✔ | ✔ | ✔ |
| `document.view.all` | | ✔ | ✔ |
| `report.view` | | ✔ | ✔ |
| `user.manage`, `audit.view`, `config.manage`, `cert.manage`, `system.monitor` | | | ✔ |


## Hiện trạng
- Quyền lấy từ client role `ksvb-api` trong token (`@PreAuthorize`); cột `role` của `app_user` chỉ dùng ở chế độ dev (`ksvb.security.enabled=false`).
- Người đăng nhập nhưng chưa có quyền KSVB: vào được, thấy văn bản liên quan tới mình (tạo, ký, theo dõi, tài liệu chung), không soạn / ký.
- `role.clerk` (văn thư = `role.user` + `document.view.all`) chưa tạo; muốn có thì thêm vào `setup-ksvb.sh` và Keycloak, backend không cần sửa.
- `config.manage`, `cert.manage`: đã có quyền và tab Quản trị, backend chưa có chức năng.
