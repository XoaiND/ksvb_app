import { download, request } from './http';
import type {
  Attachment,
  AuditEntry,
  Dashboard,
  ListParams,
  Me,
  PageResult,
  Person,
  Report,
  SaveSignRequestInput,
  SignMode,
  SignRequestDetail,
  SignRequestSummary,
  Template,
} from './types';

export { ApiError } from './http';
export type * from './types';

const SR = '/sign-requests';
const note = (n?: string) => ({ note: n ?? '' });

/** Toàn bộ lời gọi tới ksvb-be. Thông điệp lỗi (ApiError.message) đã là tiếng Việt, hiển thị thẳng cho người dùng. */
export const api = {
  me: () => request<Me>('GET', '/me'),
  users: () => request<Person[]>('GET', '/users'),

  dashboard: (year?: number) => request<Dashboard>('GET', '/dashboard', { query: { year } }),

  listSignRequests: (p: ListParams) =>
    request<PageResult<SignRequestSummary>>('GET', SR, {
      query: { scope: p.scope, q: p.q, docType: p.docType, unit: p.unit, status: p.status, page: p.page ?? 0, size: p.size ?? 10 },
    }),
  getSignRequest: (id: number) => request<SignRequestDetail>('GET', `${SR}/${id}`),
  createSignRequest: (b: SaveSignRequestInput) => request<SignRequestDetail>('POST', SR, { body: b }),
  updateSignRequest: (id: number, b: SaveSignRequestInput) => request<SignRequestDetail>('PUT', `${SR}/${id}`, { body: b }),
  deleteSignRequest: (id: number) => request<void>('DELETE', `${SR}/${id}`),
  submit: (id: number) => request<SignRequestDetail>('POST', `${SR}/${id}/submit`),
  sign: (id: number, n?: string) => request<SignRequestDetail>('POST', `${SR}/${id}/sign`, { body: note(n) }),
  reject: (id: number, reason: string) => request<SignRequestDetail>('POST', `${SR}/${id}/reject`, { body: note(reason) }),
  cancel: (id: number, reason: string) => request<SignRequestDetail>('POST', `${SR}/${id}/cancel`, { body: note(reason) }),
  recall: (id: number) => request<SignRequestDetail>('POST', `${SR}/${id}/recall`),
  remind: (id: number) => request<void>('POST', `${SR}/${id}/remind`),

  uploadAttachment: (id: number, file: File, signable: boolean) => {
    const form = new FormData();
    form.append('file', file);
    return request<Attachment>('POST', `${SR}/${id}/attachments`, { form, query: { signable } });
  },
  removeAttachment: (id: number, attachmentId: number) => request<void>('DELETE', `${SR}/${id}/attachments/${attachmentId}`),
  downloadAttachment: (id: number, a: Pick<Attachment, 'id' | 'name'>) =>
    download(`${SR}/${id}/attachments/${a.id}`, a.name),

  templates: () => request<Template[]>('GET', '/templates'),
  createTemplate: (b: { name: string; mode: SignMode; signerIds: number[] }) => request<Template>('POST', '/templates', { body: b }),
  useTemplate: (id: number) => request<Template>('POST', `/templates/${id}/use`),
  deleteTemplate: (id: number) => request<void>('DELETE', `/templates/${id}`),

  report: () => request<Report>('GET', '/reports/summary'),

  adminUsers: () => request<Person[]>('GET', '/admin/users'),
  setUserActive: (id: number, active: boolean) => request<Person>('PATCH', `/admin/users/${id}`, { body: { active } }),
  auditLogs: (page = 0, size = 20) =>
    request<PageResult<AuditEntry>>('GET', '/admin/audit-logs', { query: { page, size } }),
};
