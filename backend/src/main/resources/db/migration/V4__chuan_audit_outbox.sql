-- Đưa audit_log và ksvb_outbox về dạng chuẩn chung (docs/kien-truc-chuan.md): người thao tác lưu bằng tên đăng nhập
-- (actor), thời điểm timestamptz, outbox có phiên bản + ngày hiệu lực + payload jsonb. Không sửa V1..V3 đã áp dụng.

-- ---------- audit_log ----------
alter table audit_log add column actor varchar(100);
update audit_log a set actor = u.email from app_user u where u.id = a.actor_id;
update audit_log set actor = 'SYSTEM' where actor is null;
drop index if exists ix_audit_log_actor;
alter table audit_log drop column actor_id;
alter table audit_log alter column occurred_at type timestamptz using occurred_at at time zone 'UTC';
alter table audit_log alter column occurred_at set default now();
alter table audit_log add constraint ck_audit_log_result check (result in ('OK', 'ERROR'));
create index ix_audit_log_actor on audit_log (actor);
drop index if exists ix_audit_log_at;
create index ix_audit_log_occurred on audit_log (occurred_at desc);

-- ---------- ksvb_outbox ----------
-- Khoá nghiệp vụ của KSVB là bigint: aggregate_id uuid dựng từ id (00000000-0000-0000-0000-<id hex 12 ký tự>), số hiệu
-- đọc được nằm ở aggregate_code.
alter table ksvb_outbox alter column aggregate_id type uuid
    using ('00000000-0000-0000-0000-' || lpad(to_hex(aggregate_id::bigint), 12, '0'))::uuid;
alter table ksvb_outbox add column aggregate_ver integer not null default 0;
alter table ksvb_outbox add column effective_from date;
alter table ksvb_outbox alter column payload type jsonb using payload::jsonb;
alter table ksvb_outbox alter column occurred_at type timestamptz using occurred_at at time zone 'UTC';
alter table ksvb_outbox alter column occurred_at set default now();
alter table ksvb_outbox alter column sent_at type timestamptz using sent_at at time zone 'UTC';
alter table ksvb_outbox alter column last_error type text;
drop index if exists ix_ksvb_outbox_status;
create index ix_ksvb_outbox_pending on ksvb_outbox (occurred_at) where status <> 'SENT';
create index ix_ksvb_outbox_agg on ksvb_outbox (aggregate_type, aggregate_id);
