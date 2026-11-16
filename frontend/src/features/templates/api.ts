import { del, get, post } from '../../shared/api/http';
import type { SaveTemplateInput, Template } from '../../shared/api/types';

export const templatesApi = {
  list: () => get<Template[]>('/templates'),
  create: (b: SaveTemplateInput) => post<Template>('/templates', b),
  /** Ghi nhận mẫu vừa được dùng (thống kê "đã dùng n lần"). */
  use: (id: number) => post<Template>(`/templates/${id}/use`),
  remove: (id: number) => del<void>(`/templates/${id}`),
};
