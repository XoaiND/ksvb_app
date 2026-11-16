import { request } from '../../shared/api/http';
import type { AuditEntry, PageResult, Person } from '../../shared/api/types';

export const adminApi = {
  users: () => request<Person[]>('GET', '/admin/users'),
  setUserActive: (id: number, active: boolean) => request<Person>('PATCH', `/admin/users/${id}`, { body: { active } }),
  auditLogs: (page = 0, size = 20) => request<PageResult<AuditEntry>>('GET', '/admin/audit-logs', { query: { page, size } }),
};
