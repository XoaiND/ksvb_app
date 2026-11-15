-- ECOSYSTEM.md 12.2: nhật ký ghi cả kết quả (OK / ERROR = bị chặn) và outbox sự kiện ghi cùng transaction.
-- Viết cho PostgreSQL và H2 (profile h2).

alter table audit_log add column result varchar(10) default 'OK' not null;
create index ix_audit_log_actor on audit_log (actor_id);

-- Sự kiện chờ đẩy ra ngoài (cùng dạng hrm_outbox). Worker đẩy đi chưa có: hiện chỉ ghi.
create table ksvb_outbox (
    event_id       uuid         primary key,
    aggregate_type varchar(30)  not null,          -- SIGN_REQUEST
    aggregate_id   varchar(64)  not null,
    aggregate_code varchar(30),                    -- số hiệu, vd. HD-2026-0001
    event_type     varchar(50)  not null,          -- vd. SIGN_REQUEST_SUBMITTED
    payload        varchar(4000) not null,         -- JSON
    occurred_at    timestamp    not null,
    status         varchar(10)  default 'NEW' not null,  -- NEW / SENT / FAILED
    retry_count    integer      default 0 not null,
    sent_at        timestamp,
    last_error     varchar(1000),
    constraint ck_ksvb_outbox_status check (status in ('NEW', 'SENT', 'FAILED'))
);
create index ix_ksvb_outbox_status on ksvb_outbox (status, occurred_at);
