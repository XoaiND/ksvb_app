-- Bước ký: người cùng bước ký cùng lúc, bước sau chỉ mở khi bước trước đã ký hết.
-- Dữ liệu cũ: ký song song = mọi người bước 1; ký tuần tự = mỗi người một bước theo thứ tự.
alter table participant add column step_no integer;
update participant p
   set step_no = case when r.mode = 'PAR' then 1 else p.order_no end
  from sign_request r
 where r.id = p.request_id;
alter table participant alter column step_no set not null;

-- Thông tin bản đã ký mới nhất (cập nhật mỗi lần có người ký): dung lượng, mã SHA-256 (hex), thời điểm đóng chữ ký.
alter table attachment add column signed_size_bytes bigint;
alter table attachment add column signed_sha256 varchar(64);
alter table attachment add column signed_at timestamp;
