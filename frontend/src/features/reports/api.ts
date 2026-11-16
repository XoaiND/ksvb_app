import { get } from '../../shared/api/http';
import type { Report } from '../../shared/api/types';

export const reportsApi = {
  summary: () => get<Report>('/reports/summary'),
};
