# Cơ sở dữ liệu – KSVB

PostgreSQL, database `ksvb`, schema `ksvb` (đặt bằng `KSVB_DB_SCHEMA`), tài khoản ứng dụng `ksvb_app`.
Chỉ hỗ trợ PostgreSQL (không còn H2). Test chạy PostgreSQL 17 trong Testcontainers, schema `public` (riêng `SignRequestServiceTest` dùng `ksvb`).

## Flyway
- Migration ở `backend/src/main/resources/db/migration`. Hiện có `V1__init.sql` (toàn bộ schema ban đầu), `V2__audit_result_outbox.sql` (cột `audit_log.result`, bảng `ksvb_outbox`), `V3__auditable_columns.sql` (cột audit chung + trigger `trg_touch_row`, xem dưới), `V4__chuan_audit_outbox.sql` (đưa `audit_log`/`ksvb_outbox` về dạng chuẩn chung: `actor` là tên đăng nhập, `timestamptz`, outbox có `aggregate_ver`, `effective_from`, `payload jsonb`).
- Backend tự chạy Flyway khi khởi động; JPA ở chế độ `ddl-auto: validate` (lệch entity với bảng thì không khởi động).
- Thay đổi schema = thêm `V4__...sql`, **không sửa** file đã áp dụng (kể cả chú thích: đổi checksum làm Flyway báo lỗi).
- Cột audit chung (docs/kien-truc-chuan.md mục 3.1, giống HRM) trên `sign_request`, `sign_template`, `app_user`: `version_no` (khoá lạc quan, mặc định 1), `created_at` (DB sinh `now()`), `created_by` (người tạo, mặc định `SYSTEM`), `updated_at` + `version_no` do trigger `trg_touch_row()` cập nhật khi UPDATE, `updated_by`. Entity kế thừa `shared/audit/Auditable`.
- Tạo DB lần đầu: `backend/db/setup-postgres.sql` (role `ksvb_app`, database `ksvb`, schema `ksvb`, `search_path`), chạy bằng tài khoản quản trị Postgres.

## ERD

```mermaid
erDiagram
    app_user ||--o{ sign_request : "tạo"
    sign_request ||--o{ participant : "luồng ký"
    app_user ||--o{ participant : "ký"
    sign_request ||--o{ sign_request_watcher : "theo dõi"
    app_user ||--o{ sign_request_watcher : ""
    sign_request ||--o{ attachment : "tệp"
    app_user ||--o{ sign_template : "sở hữu"
    sign_template ||--o{ sign_template_signer : "người ký mẫu"

    app_user {
        bigint id PK
        varchar email UK
        varchar full_name
        varchar employee_code
        varchar unit_name
        varchar job_title
        varchar role
        boolean active
    }
    sign_request {
        bigint id PK
        integer version_no
        varchar code
        varchar title
        varchar doc_type
        varchar unit_name
        bigint creator_id FK
        varchar priority
        varchar mode
        varchar status
        boolean shared
        date deadline
        timestamp submitted_at
        timestamp completed_at
    }
    participant {
        bigint id PK
        bigint request_id FK
        bigint user_id FK
        int order_no
        varchar status
        timestamp signed_at
        varchar note
    }
    sign_request_watcher {
        bigint request_id PK
        bigint user_id PK
    }
    attachment {
        bigint id PK
        bigint request_id FK
        varchar original_name
        varchar stored_name
        bigint size_bytes
        boolean signable
        timestamp uploaded_at
    }
    sign_template {
        bigint id PK
        varchar name
        varchar mode
        int used_count
        bigint owner_id FK
    }
    sign_template_signer {
        bigint template_id PK
        int signer_order PK
        bigint user_id
    }
```

`doc_counter`, `audit_log` và `ksvb_outbox` đứng riêng (không khoá ngoại).

## Bảng

| Bảng | Nội dung | Ghi chú |
|---|---|---|
| `app_user` | Người dùng KSVB, tạo tự động từ token ở lần đăng nhập đầu | `email` duy nhất; `role` (`USER`/`ADMIN`) chỉ dùng ở chế độ dev; `active=false` thì không chọn vào luồng ký |
| `sign_request` | Văn bản trình ký | `status`: DRAFT/PENDING/COMPLETED/REJECTED/CANCELLED/EXPIRED; `mode`: SEQ/PAR; `priority`: NORMAL/HIGH/URGENT; `code` sinh khi trình ký lần đầu; `version_no` khoá lạc quan (cột `Auditable`); `message` lời nhắn, `cancellation_reason` lý do huỷ |
| `participant` | Người ký theo thứ tự (`order_no`) | `status`: WAITING/PENDING/SIGNED/REJECTED; `note` ghi chú khi ký hoặc lý do từ chối; xoá theo văn bản (cascade) |
| `sign_request_watcher` | Người theo dõi (chỉ xem) | khoá chính (văn bản, người) |
| `attachment` | Tệp đính kèm | `signable` = tệp cần ký (PDF); `stored_name` UUID trên đĩa (`ksvb.storage.path`) |
| `sign_template`, `sign_template_signer` | Danh sách người nhận mẫu của từng người | `used_count` tăng mỗi lần dùng |
| `doc_counter` | Bộ đếm số hiệu theo `<tiền tố>-<năm>` | khoá ghi (`SELECT … FOR UPDATE`) khi cấp số |
| `audit_log` | Nhật ký thao tác, chỉ thêm | `actor` = tên đăng nhập người thao tác (`SYSTEM` = job nền như hết hạn); `occurred_at` timestamptz; `result` = `OK` / `ERROR` (thao tác ghi bị chặn, action `BLOCKED`, ghi trong transaction riêng) |
| `ksvb_outbox` | Sự kiện chờ đẩy sang hệ thống khác (cùng dạng `hrm_outbox`) | ghi cùng transaction với nghiệp vụ; `status` NEW/SENT/FAILED, `retry_count`, `last_error`; `aggregate_id` uuid dựng từ id bigint (`new UUID(0, id)`), số hiệu ở `aggregate_code`, `aggregate_ver` = `version_no`; `payload` jsonb (id, code, title, docType, status, creatorId, actorId). **Chưa có worker đẩy đi** |

Chỉ mục: `sign_request(status)`, `sign_request(creator_id)`, `participant(request_id)`, `participant(user_id, status)` (cho "chờ tôi duyệt"), `attachment(request_id)`, `audit_log(occurred_at)`, `audit_log(actor_id)`, `ksvb_outbox(status, occurred_at)`.

## Quan hệ với HRM
KSVB **không đọc** `hrm_db`. Tên, đơn vị, chức danh, mã nhân viên lấy từ claim token Keycloak (mapper `employee_code`, `unit_code`, `position_code` do HRM/IAM cấu hình) và lưu bản sao trong `app_user`.
