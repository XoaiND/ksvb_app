import { keepPreviousData, useQuery } from '@tanstack/react-query';
import { adminApi } from './api';

export const useAdminUsers = () => useQuery({ queryKey: ['admin', 'users'], queryFn: adminApi.users });

export const useAuditLogs = (page: number, size = 20) =>
  useQuery({
    queryKey: ['admin', 'audit', page, size],
    queryFn: () => adminApi.auditLogs(page, size),
    placeholderData: keepPreviousData,
  });
