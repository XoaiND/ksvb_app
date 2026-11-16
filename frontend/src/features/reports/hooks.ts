import { useQuery } from '@tanstack/react-query';
import { reportsApi } from './api';

export const useReport = () => useQuery({ queryKey: ['reports', 'summary'], queryFn: reportsApi.summary });
