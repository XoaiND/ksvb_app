# Quy tắc nghiệp vụ – KSVB

Theo code `backend` (luật nằm trong `signrequest/domain/SignRequest.java`, `signrequest/application/SignRequestService.java`). Vi phạm trả lỗi RFC 7807 (`code`, `reason`, `detail` tiếng Việt): 400 `VALIDATION_ERROR` dữ liệu gửi lên sai (thiếu trường), 401 `UNAUTHORIZED` chưa đăng nhập, 403 `FORBIDDEN` không có quyền với văn bản, 404 `NOT_FOUND`, 409 `CONFLICT` sai trạng thái / chưa đến lượt / lệch `versionNo`, 422 `BUSINESS_RULE` vi phạm luật nghiệp vụ (`reason` ví dụ `NO_SIGNER`, `NO_PDF`, `REASON_REQUIRED`, `DUPLICATE_SIGNER`, `INVALID_PDF`, `INVALID_SCOPE`).

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
- Khoá lạc quan: `GET` trả `versionNo`; `PUT` phải gửi lại `versionNo` của bản đang sửa, lệch (người khác vừa sửa) → 409 `CONCURRENT_UPDATE`.
- Một người không được xuất hiện hai lần trong luồng ký. Người ký, người theo dõi phải là tài khoản đang hoạt động.
- Xoá chỉ áp dụng cho nháp của chính mình.
- Mặc định: ưu tiên `NORMAL` (Thường), cách ký `SEQ` (Tuần tự). Ưu tiên: Thường / Cao / Khẩn.
- Văn bản lấy đơn vị theo đơn vị của người tạo lúc tạo.

## Tệp đính kèm
- Chỉ người tạo thêm / bỏ tệp, và chỉ khi văn bản còn nháp. Ai xem được văn bản thì tải được tệp.
- **Tệp cần ký**: chỉ PDF (kiểm đuôi, chữ ký `%PDF-`, và phải mở được bằng PDFBox, có ≥ 1 trang, không mật khẩu: `INVALID_PDF` / `ENCRYPTED_PDF`).
- **Tệp tham khảo**: pdf, doc, docx, xls, xlsx, png, zip, rar.
- Tối đa 20 MB mỗi tệp. Tên lưu trên đĩa là UUID do server sinh (không dùng tên người dùng gửi).

## Ô ký
- Người xem được văn bản xem được ảnh chữ ký của những người trong luồng ký (`GET /signer-signatures`), để người soạn xem trước chữ ký thật trong từng ô trước khi trình; người chưa có ảnh vẫn trình ký được, nhưng phải tải ảnh lên trước khi ký.
- Ô ký là **annotation trong chính tệp PDF cần ký**, không lưu DB. Ô số **k** là chỗ người ký thứ **k** (`participant.order_no`) ký; một người có thể có nhiều ô (nhiều trang, nhiều tệp). Kích thước ô = kích thước chữ ký khi đóng vào PDF.
- Nhận diện (`signrequest/infra/PdfSignatureSlots`): annotation có `/NM` bắt đầu `ksvb-slot-` (do KSVB ghi), hoặc annotation FreeText / Square đặt sẵn bằng phần mềm khác có nội dung chỉ là một số 1..99 (cho phép `#2`). Ghi chú thường không bị đụng tới.
- Màn soạn có bước **Vị trí ký** (sau Người nhận): lưu nháp + tải tệp lên trước, hiện ảnh từng trang (máy chủ render JPEG, không vẽ ô) và ô đọc được; người soạn đặt thêm, kéo, đổi cỡ, đổi số, xoá ô. Lưu = ghi lại toàn bộ annotation ô ký vào PDF (tệp UUID mới, tệp cũ xoá sau commit), chỉ người tạo khi văn bản là nháp.
- Toạ độ trao đổi qua API: point, theo trang hiển thị (đã xoay theo `/Rotate`, tính từ góc trên-trái CropBox), trang đánh số từ 1.

## Trình ký
- Chỉ người tạo, chỉ từ nháp. Cần **≥ 1 người ký** và **≥ 1 tệp PDF cần ký**, và ô ký phải khớp người ký: mỗi người thứ 1..N có ≥ 1 ô trên các tệp cần ký, không có ô số > N (`SIGN_SLOTS_MISMATCH`, thông báo nêu số thiếu/thừa).
- Lần trình đầu sinh **số hiệu** `<tiền tố>-<năm>-<4 số>`, ví dụ `HD-2026-0143`. Tiền tố theo loại: Hợp đồng `HD`, Quyết định `QD`, Tờ trình `TT`, Báo giá `BG`, Biên bản `BB`, Công văn `CV`, loại khác `VB`. Bộ đếm theo tiền tố + năm (bảng `doc_counter`, khoá ghi khi cấp số nên hai lần trình cùng lúc không trùng). Thu hồi rồi trình lại giữ số cũ.
- Mỗi người ký có **bước ký** (`participant.step_no`): người cùng bước chờ ký cùng lúc (không theo thứ tự trong bước); bước sau chỉ mở khi mọi người ở bước trước đã ký. Trình ký mở bước nhỏ nhất.
- **Tuần tự (`SEQ`)**: mặc định mỗi người một bước theo thứ tự; người soạn có thể cho nhiều người **cùng một bước** (`signerSteps`, ví dụ 5 người = `[1,1,2,2,3]`). Bước hợp lệ: bắt đầu từ 1, mỗi người cùng bước với người trước hoặc sang bước kế tiếp (sai → 422 `INVALID_STEPS`). Mọi người cùng một bước (≥ 2 người) thì chính là song song nên tự đổi sang `PAR`.
- **Song song (`PAR`)**: mọi người ở bước 1, chờ ký cùng lúc (bỏ qua `signerSteps`).
- Số ô ký vẫn theo thứ tự người ký 1..N (`order_no`), không theo bước.
- Người được kích hoạt nhận thông báo (hiện chỉ ghi log).

## Ký / từ chối
- **Ký = đóng ảnh chữ ký vào PDF**: người ký phải có ảnh chữ ký (không có → 422 `NO_SIGNATURE_IMAGE`, văn bản giữ nguyên). Máy chủ đóng ảnh vào mọi ô số = `order_no` của người ký trên mọi tệp cần ký: ảnh co vừa khít ô (giữ tỉ lệ, căn giữa); mặc định ghi thêm họ tên + thời gian `dd/MM/yyyy HH:mm` dưới ảnh (người ký bỏ chọn được, `showCaption=false`; ô cao < 36 pt thì chỉ có ảnh), font LiberationSans nhúng trong PDF. Annotation của các ô đó bị xoá. Trang có `/Rotate` vẫn đóng đứng thẳng.
- Kết quả lưu thành **bản đã ký** riêng (`attachment.signed_stored_name`), mỗi lần ký ghi một bản mới từ bản trước, kèm dung lượng, mã SHA-256 và thời điểm của bản mới nhất (`signed_size_bytes`, `signed_sha256`, `signed_at`) để đối chiếu tệp tải về; **bản gốc giữ nguyên** (xem ảnh trang bản gốc bằng `?original=true`). Xem trang/ô ký luôn theo bản đã ký mới nhất; tải bản đã ký bằng `?signed=true` (tên tệp thêm " (đã ký)"). Lỗi giữa chừng → rollback, tệp mới bị xoá.
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

## Ảnh chữ ký
- Mỗi người dùng có tối đa một ảnh chữ ký (trang `/profile`), chỉ xem/sửa được ảnh của chính mình.
- Nhận PNG/JPG (kiểm theo byte đầu tệp), tối đa 5 MB, tối đa 50 triệu điểm ảnh; sai → 422 `INVALID_IMAGE` / `FILE_TOO_LARGE`.
- Máy chủ tách nền (`user/application/SignatureImageProcessor`): màu nền = trung vị dải 2% quanh mép ảnh; điểm càng tối/khác sắc so với nền càng đặc (dốc mềm giữa hai ngưỡng), bỏ ám nền khỏi màu mực; cắt sát nét + đệm 8px, thu về rộng tối đa 600px, lưu PNG trong suốt. Không còn nét nào → 422 `EMPTY_SIGNATURE`.
- Xem trước (`POST /api/me/signature/preview`) không lưu gì; lưu (`POST /api/me/signature`) thay ảnh cũ, tệp cũ xoá sau khi commit. Tệp ở `<KSVB_STORAGE_PATH>/signature/<uuid>.png`.
- Ảnh trả về giao diện dạng data URL trong JSON (`SignatureDto.imageDataUrl`).

## Nhật ký
Mọi thao tác CREATE, UPDATE, DELETE, SUBMIT, SIGN, REJECT, CANCEL, RECALL, REMIND, EXPIRE, ATTACH/DETACH (tệp), CREATE_TEMPLATE/DELETE_TEMPLATE, SLOTS_UPDATE (ghi ô ký vào PDF), SIGNATURE_UPDATE/SIGNATURE_DELETE (ảnh chữ ký) và quản trị người dùng ghi vào `audit_log` (người làm, hành động, đối tượng là số hiệu hoặc `SignRequest#id`, chi tiết, kết quả `OK`). Thao tác ghi (POST/PUT/PATCH/DELETE) bị chặn vì thiếu quyền, sai trạng thái hay vi phạm luật ghi thêm một dòng `BLOCKED` kết quả `ERROR` (đối tượng = `METHOD /api/...`, chi tiết = mã lỗi + thông điệp); lỗi kiểm tra dữ liệu đầu vào (`VALIDATION_ERROR`) không ghi. Không ghi token/mật khẩu/nội dung tệp. Xem ở Quản trị → Nhật ký (`audit.view`).

## Sự kiện (outbox)
Mỗi lần văn bản đổi trạng thái, cùng transaction ghi một dòng vào `ksvb_outbox`: `SIGN_REQUEST_SUBMITTED`, `SIGN_REQUEST_SIGNED` (mỗi chữ ký), `SIGN_REQUEST_COMPLETED`, `SIGN_REQUEST_REJECTED`, `SIGN_REQUEST_CANCELLED`, `SIGN_REQUEST_RECALLED`, `SIGN_REQUEST_EXPIRED` (aggregate `SIGN_REQUEST`). Thao tác lỗi thì không có sự kiện. Chưa có worker đẩy đi (xem `docs/adr/0001-outbox-chua-co-worker.md`).
