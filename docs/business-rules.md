# Quy tắc nghiệp vụ – KSVB

Theo code `ksvb-be` (luật nằm trong `signrequest/domain/SignRequest.java`, `signrequest/application/SignRequestService.java`). Vi phạm trả lỗi tiếng Việt: 400 dữ liệu sai, 403 không có quyền, 409 sai trạng thái.

## Trạng thái văn bản

```
DRAFT ──trình ký──▶ PENDING ──mọi người đã ký──▶ COMPLETED
  ▲                   │ ├──một người từ chối──▶ REJECTED
  └────thu hồi────────┘ ├──người tạo huỷ──────▶ CANCELLED
                        └──quá hạn ký────────▶ EXPIRED
```

| Trạng thái | Nhãn | Ý nghĩa |
|---|---|---|
| `DRAFT` | Nháp | Đang soạn, chỉ người tạo sửa/xoá |
| `PENDING` | Đang xử lý | Đã trình, đang chờ ký |
| `COMPLETED` | Hoàn thành | Mọi người ký đã ký |
| `REJECTED` | Từ chối | Một người ký từ chối (kèm lý do) |
| `CANCELLED` | Huỷ | Người tạo huỷ (kèm lý do) |
| `EXPIRED` | Hết hạn | Quá hạn ký mà chưa xong |

Trạng thái từng người ký: `WAITING` (chưa đến lượt), `PENDING` (chờ duyệt), `SIGNED` (đã ký), `REJECTED` (từ chối).

## Soạn và sửa
- Chỉ **người tạo** sửa được, và chỉ khi còn **nháp**. Sửa = thay toàn bộ thông tin, luồng ký, người theo dõi.
- Một người không được xuất hiện hai lần trong luồng ký. Người ký, người theo dõi phải là tài khoản đang hoạt động.
- Xoá chỉ áp dụng cho nháp của chính mình.
- Mặc định: ưu tiên `NORMAL` (Thường), cách ký `SEQ` (Tuần tự). Ưu tiên: Thường / Cao / Khẩn.
- Văn bản lấy đơn vị theo đơn vị của người tạo lúc tạo.

## Tệp đính kèm
- Chỉ người tạo thêm / bỏ tệp, và chỉ khi văn bản còn nháp. Ai xem được văn bản thì tải được tệp.
- **Tệp cần ký**: chỉ PDF (kiểm cả đuôi và nội dung tệp phải là PDF).
- **Tệp tham khảo**: pdf, doc, docx, xls, xlsx, png, zip, rar.
- Tối đa 20 MB mỗi tệp. Tên lưu trên đĩa là UUID do server sinh (không dùng tên người dùng gửi).

## Trình ký
- Chỉ người tạo, chỉ từ nháp. Cần **≥ 1 người ký** và **≥ 1 tệp PDF cần ký**.
- Lần trình đầu sinh **số hiệu** `<tiền tố>-<năm>-<4 số>`, ví dụ `HD-2026-0143`. Tiền tố theo loại: Hợp đồng `HD`, Quyết định `QD`, Tờ trình `TT`, Báo giá `BG`, Biên bản `BB`, Công văn `CV`, loại khác `VB`. Bộ đếm theo tiền tố + năm (bảng `doc_counter`, khoá ghi khi cấp số nên hai lần trình cùng lúc không trùng). Thu hồi rồi trình lại giữ số cũ.
- **Tuần tự (`SEQ`)**: chỉ người đầu tiên chờ ký; ký xong thì người kế tiếp được kích hoạt.
- **Song song (`PAR`)**: mọi người chờ ký cùng lúc.
- Người được kích hoạt nhận thông báo (hiện chỉ ghi log).

## Ký / từ chối
- Chỉ khi văn bản đang `PENDING` và người đó đang ở trạng thái chờ duyệt. Chưa đến lượt: "Quy trình đang ở bước trước…". Đã xử lý rồi thì không ký lại.
- Cần quyền `document.sign`. Giao diện bắt xác nhận "đã đọc và đồng ý" trước khi ký; ghi chú tuỳ chọn.
- Mọi người đã ký → `COMPLETED` (ghi thời điểm hoàn thành).
- Từ chối **bắt buộc lý do** → cả văn bản thành `REJECTED`.

## Huỷ, thu hồi, nhắc ký
- **Huỷ**: chỉ người tạo, khi `PENDING` và **chưa ai ký hoặc từ chối**; bắt buộc lý do.
- **Thu hồi** về nháp: cùng điều kiện như huỷ; luồng ký đặt lại từ đầu.
- **Nhắc ký**: chỉ người tạo, khi `PENDING`; gửi tới người đang chờ.

## Hết hạn
- Job chạy 01:00 hằng ngày: văn bản `PENDING` có hạn ký **trước hôm nay** chuyển `EXPIRED`, ghi nhật ký người thực hiện trống (hệ thống).

## Ai xem được văn bản
Có quyền `document.view.all`, hoặc văn bản **chung** (`shared`), hoặc mình là **người tạo / người ký / người theo dõi**. Không thoả thì 403 (kể cả tải tệp).

Danh sách theo phạm vi:
- `pending` (Chờ tôi duyệt): văn bản `PENDING` mà mình đang ở trạng thái chờ duyệt.
- `mine` (Tài liệu cá nhân): mình tạo, mọi trạng thái.
- `shared` (Tài liệu chung): văn bản đánh dấu chung.
- `watching` (Tôi theo dõi): mình là người theo dõi.

## Người nhận mẫu
- Mỗi người chỉ thấy và xoá mẫu của mình. Một người không xuất hiện hai lần trong mẫu.
- Dùng mẫu: điền sẵn người ký + cách ký vào bước 2, tăng số "đã dùng n lần".

## Người dùng
- Tài khoản `app_user` tự tạo ở lần đăng nhập đầu từ claim token (`email`, `name`, `employee_code`, `unit_name`|`unit_code`, `position_name`|`position_code`), cập nhật lại mỗi lần sau.
- Quản trị bật/tắt tài khoản (`user.manage`); không tự vô hiệu hoá chính mình. Tài khoản bị tắt không được chọn vào luồng ký.
- Quyền lấy từ token (client role `ksvb-api`); cột `app_user.role` chỉ dùng ở chế độ dev không Keycloak.

## Nhật ký
Mọi thao tác CREATE, UPDATE, DELETE, SUBMIT, SIGN, REJECT, CANCEL, RECALL, REMIND, EXPIRE, ATTACH/DETACH (tệp), CREATE_TEMPLATE/DELETE_TEMPLATE và quản trị người dùng ghi vào `audit_log` (người làm, hành động, đối tượng là số hiệu hoặc `SignRequest#id`, chi tiết, kết quả `OK`). Thao tác ghi (POST/PUT/PATCH/DELETE) bị chặn vì thiếu quyền, sai trạng thái hay vi phạm luật ghi thêm một dòng `BLOCKED` kết quả `ERROR` (đối tượng = `METHOD /api/...`, chi tiết = mã lỗi + thông điệp); lỗi kiểm tra dữ liệu đầu vào (`VALIDATION_ERROR`) không ghi. Không ghi token/mật khẩu/nội dung tệp. Xem ở Quản trị → Nhật ký (`audit.view`).

## Sự kiện (outbox)
Mỗi lần văn bản đổi trạng thái, cùng transaction ghi một dòng vào `ksvb_outbox`: `SIGN_REQUEST_SUBMITTED`, `SIGN_REQUEST_SIGNED` (mỗi chữ ký), `SIGN_REQUEST_COMPLETED`, `SIGN_REQUEST_REJECTED`, `SIGN_REQUEST_CANCELLED`, `SIGN_REQUEST_RECALLED`, `SIGN_REQUEST_EXPIRED` (aggregate `SIGN_REQUEST`). Thao tác lỗi thì không có sự kiện. Chưa có worker đẩy đi (xem `docs/adr/0002-outbox-chua-co-worker.md`).
