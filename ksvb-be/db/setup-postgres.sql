-- Tạo user + database + schema RIÊNG cho KSVB trên PostgreSQL (chạy MỘT lần, bằng tài khoản quản trị DB).
--
--   psql -h <host> -U <tài khoản quản trị> -d postgres -v ON_ERROR_STOP=1 \
--        -v app_password='<mật khẩu cho ksvb_app>' -f ksvb-be/db/setup-postgres.sql
--
-- Mật khẩu truyền qua biến psql, KHÔNG ghi vào file. Sau khi chạy, đặt trong .env:
--   KSVB_DB_URL=jdbc:postgresql://<host>:5432/ksvb
--   KSVB_DB_USER=ksvb_app
--   KSVB_DB_PASSWORD=<mật khẩu vừa đặt>
-- Bảng do Flyway tạo khi ksvb-be khởi động lần đầu (profile prod); không tạo bảng ở đây.

-- 1) User đăng nhập thường (không superuser, không tạo DB/role).
CREATE ROLE ksvb_app LOGIN PASSWORD :'app_password'
    NOSUPERUSER NOCREATEDB NOCREATEROLE;

-- 2) Database riêng, chủ sở hữu là ksvb_app; người khác không được kết nối.
CREATE DATABASE ksvb OWNER ksvb_app;
REVOKE ALL ON DATABASE ksvb FROM PUBLIC;
GRANT CONNECT ON DATABASE ksvb TO ksvb_app;

\connect ksvb

-- 3) Schema riêng; bỏ quyền mặc định của schema public.
REVOKE ALL ON SCHEMA public FROM PUBLIC;
CREATE SCHEMA ksvb AUTHORIZATION ksvb_app;

-- 4) Mặc định cho mọi kết nối của ksvb_app là schema ksvb. Ứng dụng cũng khai báo schema tường minh qua
--    KSVB_DB_SCHEMA (mặc định ksvb) nên bước này chỉ là lớp bảo hiểm cho các công cụ khác (psql, DBeaver).
ALTER ROLE ksvb_app IN DATABASE ksvb SET search_path = ksvb;
