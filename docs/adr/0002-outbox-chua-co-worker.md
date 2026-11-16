# 0002 – Outbox `ksvb_outbox` ghi trước, worker đẩy đi làm sau

Ngày: 15/11/2026. Trạng thái: đã áp dụng phần ghi (Đợt 3).

## Bối cảnh
ECOSYSTEM.md 12.2 yêu cầu ghi sự kiện vào `<app>_outbox` cùng transaction với nghiệp vụ, worker đẩy đi sau. Hệ sinh thái chưa có Kafka/kênh nhận sự kiện; HRM cũng mới ghi `hrm_outbox`, worker đồng bộ Keycloak mặc định tắt. Chưa app nào cần sự kiện của KSVB.

## Quyết định
- Bảng `ksvb_outbox` (Flyway `V2`) cùng cột với `hrm_outbox` (khoá `event_id` UUID, `aggregate_type/id/code`, `event_type`, `payload` JSON, `status` NEW/SENT/FAILED, `retry_count`, `sent_at`, `last_error`). Khác: `payload` là `varchar(4000)` thay `jsonb`, `aggregate_id` là chuỗi, vì migration phải chạy được cả trên H2 (profile `h2`). (Từ 16/11/2026 KSVB chỉ còn PostgreSQL – ECOSYSTEM.md 12.7 – nên có thể đổi sang `jsonb` bằng migration mới khi làm worker.)
- `OutboxService.publish` dùng `Propagation.MANDATORY`: gọi ngoài transaction là lỗi, không ghi lẻ.
- Chưa viết worker. `OutboxRepository.findTop100ByStatusOrderByOccurredAtAsc("NEW")` sẵn cho worker sau này.

## Hệ quả
- Bảng sẽ lớn dần khi chưa có worker dọn: khi làm worker cần thêm job xoá dòng `SENT` cũ.
- Khi có kênh (Kafka/webhook), viết worker có khoá (`FOR UPDATE SKIP LOCKED`) để chạy nhiều instance an toàn.
