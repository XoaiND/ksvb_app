import type { Me } from '../api/types';

/** Có quyền (client role `ksvb-api`) không. Chỉ để ẩn/hiện giao diện: backend mới là nơi kiểm quyền thật. */
export const hasPermission = (me: Me | null | undefined, permission: string): boolean => !!me?.permissions.includes(permission);

/** Các quyền mở được trang Quản trị (bất kỳ một). */
export const ADMIN_PERMISSIONS = ['user.manage', 'audit.view', 'config.manage', 'cert.manage'];
