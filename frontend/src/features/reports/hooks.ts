import { useApiQuery } from '../../shared/api/query';
import { reportsApi } from './api';

export const useReport = () => useApiQuery(['reports', 'summary'], reportsApi.summary, { silent: true, keepPrevious: false });
