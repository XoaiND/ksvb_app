import { keepPreviousData, useQuery } from '@tanstack/react-query';
import { request } from '../../shared/api/http';
import { queryKeys } from '../../shared/api/queryClient';
import type { Dashboard } from '../../shared/api/types';

export const useDashboard = (year: number) =>
  useQuery({
    queryKey: [...queryKeys.dashboard, year],
    queryFn: () => request<Dashboard>('GET', '/dashboard', { query: { year } }),
    placeholderData: keepPreviousData,
  });
