import type { Me } from '../api/types';

/** Danh sách quyền chi tiết (client role của ksvb-api), khớp backend `Permissions.java` và docs/phan-quyen.md. */
export const PERMISSIONS: [string, string][] = [
  ['document.create', 'Soạn, trình ký, huỷ, thu hồi văn bản'],
  ['document.sign', 'Ký / từ chối văn bản'],
  ['document.view.all', 'Xem mọi văn bản'],
  ['report.view', 'Xem báo cáo'],
  ['user.manage', 'Quản lý người dùng'],
  ['audit.view', 'Xem nhật ký'],
  ['config.manage', 'Cấu hình hệ thống'],
  ['cert.manage', 'Quản lý chứng thư số'],
  ['system.monitor', 'Giám sát hệ thống'],
];

export const ROLE_LABEL: Record<string, string> = {
  'role.user': 'Người dùng',
  'role.leader': 'Lãnh đạo',
  'role.admin': 'Quản trị',
};

const USER = ['document.create', 'document.sign'];
const LEADER = [...USER, 'document.view.all', 'report.view'];

/** Role tổng hợp (composite role ở Keycloak, docs/keycloak/setup-ksvb.sh). */
export const ROLE_PERMISSIONS: Record<string, string[]> = {
  'role.user': USER,
  'role.leader': LEADER,
  'role.admin': PERMISSIONS.map((p) => p[0]),
};

/** Các quyền mở được trang Quản trị (bất kỳ một). */
export const ADMIN_PERMISSIONS = ['user.manage', 'audit.view', 'config.manage', 'cert.manage'];

/** Có quyền không. Chỉ để ẩn/hiện giao diện: backend mới là nơi kiểm quyền thật. */
export const hasPermission = (me: Me | null | undefined, permission: string): boolean => !!me?.permissions.includes(permission);
