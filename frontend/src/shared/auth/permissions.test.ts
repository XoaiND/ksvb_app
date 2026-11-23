import { describe, expect, it } from 'vitest';
import { ADMIN_PERMISSIONS, hasPermission, PERMISSIONS, ROLE_LABEL, ROLE_PERMISSIONS } from './permissions';

const ALL = PERMISSIONS.map((p) => p[0]);

describe('ma trận quyền', () => {
  it('mã quyền không trùng nhau', () => {
    expect(new Set(ALL).size).toBe(ALL.length);
  });

  it('mọi quyền của mỗi role đều có trong danh sách quyền, mọi role có nhãn', () => {
    for (const [role, perms] of Object.entries(ROLE_PERMISSIONS)) {
      expect(ROLE_LABEL[role], role).toBeTruthy();
      for (const p of perms) expect(ALL, `${role} có quyền lạ ${p}`).toContain(p);
    }
  });

  it('role cao bao gồm role thấp: user ⊆ leader ⊆ admin, admin có đủ quyền', () => {
    for (const p of ROLE_PERMISSIONS['role.user']) expect(ROLE_PERMISSIONS['role.leader']).toContain(p);
    expect([...ROLE_PERMISSIONS['role.admin']].sort()).toEqual([...ALL].sort());
  });

  it('chỉ admin có quyền quản trị', () => {
    for (const role of ['role.user', 'role.leader'])
      for (const p of ADMIN_PERMISSIONS) expect(ROLE_PERMISSIONS[role]).not.toContain(p);
  });

  it('hasPermission theo danh sách quyền của /api/me', () => {
    const me = { id: 1, fullName: 'A', email: 'a@x', permissions: ['document.sign'], hasSignature: false };
    expect(hasPermission(me, 'document.sign')).toBe(true);
    expect(hasPermission(me, 'document.create')).toBe(false);
    expect(hasPermission(null, 'document.sign')).toBe(false);
  });
});
