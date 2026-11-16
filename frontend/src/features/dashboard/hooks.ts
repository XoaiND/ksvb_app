import { keepPreviousData, useQuery } from '@tanstack/react-query';
import { dashboardApi } from './api';

export const dashboardKeys = { all: ['dashboard'] as const };

export const useDashboard = (year: number) =>
  useQuery({ queryKey: [...dashboardKeys.all, year], queryFn: () => dashboardApi.get(year), placeholderData: keepPreviousData });
