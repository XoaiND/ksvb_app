# Kiến trúc KSVB

Theo chuẩn: `../../docs/kien-truc-chuan.md` (hệ sinh thái). File này chỉ ghi phần riêng của KSVB; phần chung xem chuẩn.

## 1. Vai trò
KSVB là hệ thống trình ký / ký số văn bản: người soạn tải tệp PDF cần ký (kèm tệp tham khảo), chọn người ký (tuần tự hoặc
song song) và người theo dõi, trình ký; người ký ký hoặc từ chối khi đến lượt; mọi người theo dõi tiến độ và lưu trữ. KSVB
**không phải** nguồn gốc dữ liệu nào của hệ sinh thái ngoài văn bản, yêu cầu ký, mẫu người nhận và nhật ký ký. Người dùng,
đơn vị, chức danh lấy từ HRM qua claim của token (`employee_code`, `unit_code`, `position_code`, `email`, `name`): KSVB chỉ
giữ bản chụp ở bảng `app_user` (tạo ở lần đăng nhập đầu, cập nhật các lần sau), không đọc `hrm_db`.

## 2. Thông số
| Mục | Giá trị |
|---|---|
| Gói gốc | `vn.vbi.ksvb` |
| Cổng | backend 8082, frontend dev 5174, docker 3001 → 8080 |
| Database | `ksvb`, schema `ksvb`, role `ksvb_app` |
| Keycloak | realm `dev`, client `ksvb-web` (public, PKCE), `ksvb-api` (client role = quyền) |
| Tiền tố biến | `KSVB_` |

## 3. Tính năng
| Tính năng | Backend `<feature>/` | Frontend `features/` | Quyền | Bảng chính |
|---|---|---|---|---|
| Văn bản trình ký (soạn, trình, ký, từ chối, huỷ, thu hồi, nhắc, tệp đính kèm, theo dõi) | `signrequest` | `documents`, `compose` | `document.create`, `document.sign`, `document.view.all` | `sign_request`, `participant`, `sign_request_watcher`, `attachment`, `doc_counter` |
| Mẫu người nhận | `template` | `templates` | đã đăng nhập (mẫu của mình) | `sign_template`, `sign_template_signer` |
| Người dùng | `user` | `profile`, `auth` | đã đăng nhập | `app_user` |
| Dashboard, Báo cáo | `report` | `dashboard`, `reports` | đã đăng nhập / `report.view` | đọc `sign_request`, `participant` |
| Quản trị (người dùng, nhật ký) | `admin` | `admin` | `user.manage`, `audit.view` (`config.manage`, `cert.manage`: chưa có chức năng) | `app_user`, `audit_log` |

## 4. Thành phần riêng của app
- **Lưu tệp PDF**: `signrequest/application/AttachmentService` ghi tệp vào thư mục `KSVB_STORAGE_PATH` (mặc định `./data/upload`,
  trong Docker `/app/data/upload` là volume), tên UUID do server sinh, kiểm đuôi và chữ ký `%PDF-`, tối đa 20 MB.
- **Số hiệu văn bản** (`HD-2026-0001`): `signrequest/application/SignRequestService.nextCode` đọc bộ đếm `doc_counter` với khoá ghi
  (`SELECT ... FOR UPDATE`), tiền tố theo loại văn bản.
- **Hết hạn ký**: `signrequest/application/ExpiryJob` chạy hằng ngày, chuyển văn bản quá hạn sang `EXPIRED`.
- **Thông báo**: `signrequest/domain/NotificationService` (cổng) và `signrequest/infra/LoggingNotificationService` (hiện chỉ ghi log;
  chưa gửi email).
- **Dữ liệu mẫu**: `signrequest/infra/DemoDataLoader`, chỉ nạp vào DB trống khi `KSVB_SEED_DEMO=true` (dev).
- **Người dùng từ token**: `user/application/UserProvisioningService` và `shared/security/CurrentUser`; chế độ dev
  (`KSVB_SECURITY_ENABLED=false`) dùng `DevUserFilter` lấy người dùng theo header `X-User-Id`, bị chặn ở profile `prod`.

## 5. Tích hợp
| Với | Cách | Trạng thái |
|---|---|---|
| Keycloak (đăng nhập) | JWT (JWKS), audience `ksvb-api`, quyền từ `resource_access.ksvb-api.roles` | đã làm; chưa chạy thử trên Keycloak thật |
| HRM | claim `employee_code`, `unit_code`, `position_code` trong token (mapper tạo bằng `docs/keycloak/setup-ksvb.sh`) | đã đọc claim; chưa chạy thử |
| HRM (tên đơn vị, cây đơn vị) | API HRM bằng service account `client_credentials` (`*.view`, audience `hrm-api`) | chưa làm; hiện hiện mã đơn vị nếu token không có tên |
| Email | `NotificationService` | chưa làm (chỉ ghi log) |

## 6. Sự kiện outbox
Bảng `ksvb_outbox`, aggregate `SIGN_REQUEST`. Chưa có worker đẩy đi (ADR 0001).

| Loại sự kiện | Khi nào | Ai tiêu thụ |
|---|---|---|
| `SIGN_REQUEST_SUBMITTED` | trình ký | chưa có |
| `SIGN_REQUEST_SIGNED` | mỗi chữ ký | chưa có |
| `SIGN_REQUEST_COMPLETED` | mọi người đã ký | chưa có |
| `SIGN_REQUEST_REJECTED`, `SIGN_REQUEST_CANCELLED`, `SIGN_REQUEST_RECALLED`, `SIGN_REQUEST_EXPIRED` | từ chối, huỷ, thu hồi, quá hạn | chưa có |

Mỗi thao tác ghi cũng ghi một dòng `audit_log` (cùng transaction; thao tác bị chặn ghi `result=ERROR`).

## 7. Quyết định riêng (ADR)
| ADR | Nội dung |
|---|---|
| `adr/0001-outbox-chua-co-worker.md` | Outbox ghi trước, worker đẩy đi làm sau |
