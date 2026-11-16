import { useApiQuery } from '../../shared/api/query';
import { templatesApi } from './api';

export const templateKeys = { all: ['templates'] as const };

export const useTemplates = () => useApiQuery(templateKeys.all, templatesApi.list, { silent: true, keepPrevious: false });
