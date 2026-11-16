import { useApiQuery } from '../../shared/api/query';
import { adminApi } from './api';

export const useAdminUsers = () => useApiQuery(['admin', 'users'], adminApi.users, { silent: true, keepPrevious: false });

export const useAuditLogs = (page: number, size = 20) =>
  useApiQuery(['admin', 'audit', page, size], () => adminApi.auditLogs(page, size), { silent: true });
