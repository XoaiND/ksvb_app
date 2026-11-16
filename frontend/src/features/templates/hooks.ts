import { useQuery } from '@tanstack/react-query';
import { templatesApi } from './api';

export const templateKeys = { all: ['templates'] as const };

export const useTemplates = () => useQuery({ queryKey: templateKeys.all, queryFn: templatesApi.list });
