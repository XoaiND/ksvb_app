-- Ảnh chữ ký (PNG đã tách nền) của người dùng: tên tệp UUID trong thư mục <KSVB_STORAGE_PATH>/signature.
alter table app_user add column signature_stored_name varchar(100);
alter table app_user add column signature_updated_at timestamp;
