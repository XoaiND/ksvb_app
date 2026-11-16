import { get } from '../../shared/api/http';
import type { Dashboard } from '../../shared/api/types';

export const dashboardApi = {
  get: (year: number) => get<Dashboard>('/dashboard', { year }),
};
