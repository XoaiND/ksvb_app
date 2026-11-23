--
-- PostgreSQL database dump
--

\restrict kIYwMsVIQY4DL1O29reaaL2eS7lMTxD7TpsuTTacM0HzzUhqIW7Lq8nnH5bbWyy

-- Dumped from database version 16.15
-- Dumped by pg_dump version 16.15

SET statement_timeout = 0;
SET lock_timeout = 0;
SET idle_in_transaction_session_timeout = 0;
SET client_encoding = 'UTF8';
SET standard_conforming_strings = on;
SELECT pg_catalog.set_config('search_path', '', false);
SET check_function_bodies = false;
SET xmloption = content;
SET client_min_messages = warning;
SET row_security = off;

--
-- Data for Name: app_user; Type: TABLE DATA; Schema: ksvb; Owner: ksvb_app
--

COPY ksvb.app_user (id, full_name, email, employee_code, unit_name, job_title, role, active, version_no, created_at, created_by, updated_at, updated_by) FROM stdin;
1	Đoàn Nguyễn Đình	doannd@example.com	NV000011	DV00533	CD026	USER	t	1	2026-11-16 16:20:56.085212+00	SYSTEM	\N	\N
\.


--
-- Name: app_user_id_seq; Type: SEQUENCE SET; Schema: ksvb; Owner: ksvb_app
--

SELECT pg_catalog.setval('ksvb.app_user_id_seq', 1, true);


--
-- PostgreSQL database dump complete
--

\unrestrict kIYwMsVIQY4DL1O29reaaL2eS7lMTxD7TpsuTTacM0HzzUhqIW7Lq8nnH5bbWyy

