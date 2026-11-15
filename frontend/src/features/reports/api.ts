import { useQuery } from '@tanstack/react-query';
import { request } from '../../shared/api/http';
import type { Report } from '../../shared/api/types';

export const useReport = (enabled: boolean) =>
  useQuery({ queryKey: ['reports', 'summary'], queryFn: () => request<Report>('GET', '/reports/summary'), enabled });
