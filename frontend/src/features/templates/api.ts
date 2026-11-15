import { useQuery } from '@tanstack/react-query';
import { request } from '../../shared/api/http';
import { queryKeys } from '../../shared/api/queryClient';
import type { SaveTemplateInput, Template } from '../../shared/api/types';

export const templatesApi = {
  list: () => request<Template[]>('GET', '/templates'),
  create: (b: SaveTemplateInput) => request<Template>('POST', '/templates', { body: b }),
  /** Ghi nhận mẫu vừa được dùng (thống kê "đã dùng n lần"). */
  use: (id: number) => request<Template>('POST', `/templates/${id}/use`),
  remove: (id: number) => request<void>('DELETE', `/templates/${id}`),
};

export const useTemplates = () => useQuery({ queryKey: queryKeys.templates, queryFn: templatesApi.list });
