# Yêu cầu – KSVB (Ký số văn bản)

Viết theo code hiện tại (15/11/2026): `ksvb-fe/src/features/*`, `ksvb-be/.../<tính năng>/{api,application,domain}`.

## Mục tiêu
Người soạn trình văn bản (tệp PDF cần ký, kèm tệp tham khảo) qua luồng ký nhiều người, tuần tự hoặc song song. Người ký ký hoặc từ chối khi đến lượt. Mọi người theo dõi tiến độ, lưu trữ, xem báo cáo.

## Ngoài phạm vi
- Quản lý nhân viên, đơn vị, chức danh: thuộc HRM. KSVB lấy thông tin người dùng từ token Keycloak.
- Đăng nhập, mật khẩu, gán quyền: thuộc Keycloak (realm `dev`, client `ksvb-web` / `ksvb-api`).

## Vai trò (role tổng hợp trong Keycloak, chi tiết ở `PHAN_QUYEN.md`)
| Vai trò | Được làm |
|---|---|
| `role.user` – Người dùng | Soạn, trình ký, ký/từ chối khi đến lượt |
| `role.leader` – Lãnh đạo | Như trên + xem mọi văn bản + xem báo cáo |
| `role.admin` – Quản trị | Mọi quyền, gồm quản lý người dùng, nhật ký, (sau này) cấu hình, chứng thư số |
| Đăng nhập nhưng chưa có quyền | Vào được, xem văn bản liên quan tới mình, không soạn / ký |

## Chức năng

| Màn hình (route) | Chức năng | Quyền |
|---|---|---|
| Đăng nhập (`/login`) | Nút đăng nhập SSO Keycloak, chọn giao diện sáng/tối | – |
| Dashboard (`/dashboard`) | Tổng quan theo trạng thái (biểu đồ tròn), ô số "chờ duyệt / cá nhân / chung / khác", thông tin cá nhân, văn bản hoàn tất theo tháng (chọn năm), danh sách "việc cần xử lý ngay" kèm nút Ký ngay | đăng nhập |
| Soạn tài liệu mới (`/compose`, sửa nháp `/compose?id=`) | 3 bước: (1) tiêu đề, loại, hạn ký, ưu tiên, mô tả, tệp PDF cần ký, tệp tham khảo; (2) người ký (thêm, đổi thứ tự, dùng danh sách mẫu), cách ký tuần tự/song song, người theo dõi, lời nhắn; (3) xem lại, xem trước sơ đồ chữ ký, Lưu nháp hoặc Trình ký | `document.create` |
| Lưu trữ tài liệu (`/documents?tab=1\|2\|3`) | 3 tab: Chờ tôi duyệt, Tài liệu cá nhân (mình tạo), Tài liệu chung. Lọc theo tiêu đề/mã, loại, đơn vị, trạng thái; phân trang. Thao tác theo dòng: Ký, Xem, Sửa/Xoá nháp, Huỷ | đăng nhập |
| Chi tiết (`/documents/:id`) và màn ký (`/documents/:id/sign`) | Trang giấy sơ đồ chữ ký, tệp đính kèm (tải xuống), tab Luồng ký / Lịch sử / Thông tin, lời nhắn của người soạn. Ký (ghi chú + xác nhận đã đọc), Từ chối (bắt buộc lý do). Người tạo: Nhắc ký, Thu hồi, Huỷ, Sửa / Xoá nháp | xem được văn bản; ký cần `document.sign` |
| Tôi theo dõi (`/watching`) | Văn bản mình được thêm làm người theo dõi | đăng nhập |
| Người nhận mẫu (`/templates`) | Danh sách người ký mẫu (tên, cách ký, người ký theo thứ tự), tạo, xoá, dùng mẫu để soạn | `document.create` (menu) |
| Báo cáo (`/reports`) | Tổng văn bản, thời gian ký trung bình, tỷ lệ đúng hạn, số quá hạn, văn bản theo đơn vị, người ký chậm nhất | `report.view` |
| Quản trị (`/admin`) | Tab Người dùng (bật/tắt tài khoản), Nhật ký thao tác; Chứng thư số, Cấu hình (chưa có backend) | `user.manage`, `audit.view`, `cert.manage`, `config.manage` |
| Thông tin cá nhân & chữ ký (`/profile`) | Thông tin từ Keycloak/HRM, danh sách quyền, chữ ký (chưa tải ảnh được), chọn giao diện | đăng nhập |

Chung: menu trái thu gọn được (phím `[`), dưới 1024px thành ngăn kéo; chuông báo số văn bản chờ mình ký; tìm nhanh tài liệu ở thanh trên; thông điệp tiếng Việt.

## Phi chức năng
- Xác thực JWT Keycloak (`aud=ksvb-api`), quyền kiểm ở backend bằng `@PreAuthorize`; giao diện chỉ ẩn/hiện.
- Tệp tối đa 20 MB, lưu trên đĩa với tên do server sinh.
- Chạy cùng lúc với HRM trên một máy (cổng riêng 8082 / 5174 / 3001).
- Giao diện sáng/tối, dùng được trên điện thoại (bảng chuyển thành thẻ).

## Chưa làm
Ký số PKI thật, xem PDF trong trình duyệt, tải ảnh chữ ký, email thật, cấu hình hệ thống, chứng thư số, xuất Excel, sửa mẫu người nhận, cây đơn vị từ API HRM, phân quyền dữ liệu theo đơn vị.
