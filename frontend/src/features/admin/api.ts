import { keepPreviousData, useQuery } from '@tanstack/react-query';
import { request } from '../../shared/api/http';
import type { AuditEntry, PageResult, Person } from '../../shared/api/types';

export const adminApi = {
  users: () => request<Person[]>('GET', '/admin/users'),
  setUserActive: (id: number, active: boolean) => request<Person>('PATCH', `/admin/users/${id}`, { body: { active } }),
  auditLogs: (page = 0, size = 20) => request<PageResult<AuditEntry>>('GET', '/admin/audit-logs', { query: { page, size } }),
};

export const useAdminUsers = () => useQuery({ queryKey: ['admin', 'users'], queryFn: adminApi.users });

export const useAuditLogs = (page: number, size = 20) =>
  useQuery({
    queryKey: ['admin', 'audit', page, size],
    queryFn: () => adminApi.auditLogs(page, size),
    placeholderData: keepPreviousData,
  });
