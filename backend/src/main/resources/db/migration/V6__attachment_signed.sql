-- Bản đã đóng chữ ký của tệp cần ký (tên tệp UUID). null = chưa ai ký; tệp gốc (stored_name) giữ nguyên.
alter table attachment add column signed_stored_name varchar(100);
