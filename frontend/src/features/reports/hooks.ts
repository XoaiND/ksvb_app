import { useQuery } from '@tanstack/react-query';
import { reportsApi } from './api';

export const useReport = (enabled: boolean) =>
  useQuery({ queryKey: ['reports', 'summary'], queryFn: reportsApi.summary, enabled });
