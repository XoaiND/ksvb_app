-- Cột audit chung trên bảng nghiệp vụ (ECOSYSTEM.md 12.7, giống HRM): version_no (khoá lạc quan), created_at/by,
-- updated_at/by. created_at do DB sinh, updated_at + version_no do trigger trg_touch_row() cập nhật khi UPDATE;
-- created_by/updated_by do ứng dụng ghi (lớp Auditable). Chỉ chạy trên PostgreSQL.

create or replace function trg_touch_row() returns trigger
language plpgsql as $$
begin
  new.updated_at := now();
  new.version_no := old.version_no + 1;
  return new;
end $$;

-- sign_request đã có version/created_at/updated_at (timestamp, ứng dụng tự ghi) → đổi về dạng chung
alter table sign_request rename column version to version_no;
alter table sign_request alter column version_no type integer;
alter table sign_request alter column version_no set default 1;
alter table sign_request alter column created_at type timestamptz;
alter table sign_request alter column created_at set default now();
alter table sign_request alter column updated_at type timestamptz;
alter table sign_request alter column updated_at drop not null;
alter table sign_request add column created_by varchar(50) not null default 'SYSTEM';
alter table sign_request add column updated_by varchar(50);
create trigger tg_sign_request_touch before update on sign_request for each row execute function trg_touch_row();

alter table sign_template
    add column version_no integer     not null default 1,
    add column created_at timestamptz not null default now(),
    add column created_by varchar(50) not null default 'SYSTEM',
    add column updated_at timestamptz,
    add column updated_by varchar(50);
create trigger tg_sign_template_touch before update on sign_template for each row execute function trg_touch_row();

alter table app_user
    add column version_no integer     not null default 1,
    add column created_at timestamptz not null default now(),
    add column created_by varchar(50) not null default 'SYSTEM',
    add column updated_at timestamptz,
    add column updated_by varchar(50);
create trigger tg_app_user_touch before update on app_user for each row execute function trg_touch_row();
