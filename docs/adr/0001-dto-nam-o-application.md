# 0001 – DTO request/response nằm ở `application/`, không ở `api/`

Ngày: 15/11/2026. Trạng thái: đã áp dụng (Đợt 3, nhánh `chuan/dot-3-cau-truc`).

## Bối cảnh
ECOSYSTEM.md 12.1 ghi `api/` chứa "Controller + DTO request/response (record)" và đồng thời yêu cầu phụ thuộc một chiều `api → application → domain` (kiểm bằng ArchUnit). Ở KSVB các service nhận thẳng record request (`SaveSignRequest`, `ActionRequest`, `SaveTemplate`, `UpdateUser`) và trả record response (`SignRequestDetail`, `PageResponse<SignRequestSummary>`...). Nếu để các record này ở `api/` thì `application` phụ thuộc ngược `api`.

## Quyết định
Các record mà service nhận/trả nằm trong `<feature>/application/` (vd. `signrequest/application/SignRequestDetail`). Controller ở `api/` chỉ nhận/trả lại chính các record đó, không chứa logic. `ArchitectureTest` cấm `application → api`, `api → infra`, `infra → application|api`, `domain → Spring|api|application|infra`.

## Hệ quả
- Lệch chữ so với 12.1 (vị trí DTO) nhưng giữ đúng mục đích (phụ thuộc một chiều, controller mỏng, không trả entity).
- Khi cần DTO riêng cho API (khác dạng service), đặt ở `api/` và ánh xạ trong controller.
- HRM nên chọn cùng cách để hai app giống nhau.
