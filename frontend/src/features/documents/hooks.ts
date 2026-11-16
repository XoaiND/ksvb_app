import { keepPreviousData, useQuery, useQueryClient } from '@tanstack/react-query';
import type { ListParams } from '../../shared/api/types';
import { dashboardKeys } from '../dashboard/hooks';
import { documentsApi } from './api';

/** Khoá cache của tính năng văn bản (làm mới cả nhóm sau thao tác ghi). */
const documentKeys = {
  all: ['sign-requests'] as const,
  users: ['users'] as const,
  pendingCount: ['sign-requests', 'pending-count'] as const,
};

export const useUsers = () => useQuery({ queryKey: documentKeys.users, queryFn: documentsApi.users, staleTime: 60_000 });

/** Danh sách đơn vị (lấy từ danh bạ người dùng) cho bộ lọc. */
export function useUnits(): string[] {
  const { data } = useUsers();
  return [...new Set((data ?? []).map((x) => x.unitName).filter((x): x is string => !!x))].sort();
}

export const useSignRequests = (p: ListParams) =>
  useQuery({
    queryKey: [...documentKeys.all, 'list', p],
    queryFn: () => documentsApi.list(p),
    placeholderData: keepPreviousData,
  });

export const useSignRequest = (id: number) =>
  useQuery({ queryKey: [...documentKeys.all, 'detail', id], queryFn: () => documentsApi.get(id) });

/** Số văn bản đang chờ tôi ký (huy hiệu ở menu, chuông). */
export const usePendingCount = () =>
  useQuery({
    queryKey: documentKeys.pendingCount,
    queryFn: () => documentsApi.list({ scope: 'pending', size: 1 }).then((r) => r.totalElements),
  }).data ?? 0;

/** Sau thao tác ghi: làm mới mọi danh sách/chi tiết văn bản, số việc chờ ký và dashboard. */
export function useRefreshDocuments() {
  const qc = useQueryClient();
  return () => {
    void qc.invalidateQueries({ queryKey: documentKeys.all });
    void qc.invalidateQueries({ queryKey: dashboardKeys.all });
  };
}
