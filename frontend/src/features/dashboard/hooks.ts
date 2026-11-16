import { useApiQuery } from '../../shared/api/query';
import { dashboardApi } from './api';

export const dashboardKeys = { all: ['dashboard'] as const };

export const useDashboard = (year: number) =>
  useApiQuery([...dashboardKeys.all, year], () => dashboardApi.get(year), { silent: true });
