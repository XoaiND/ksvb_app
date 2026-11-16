import { download, put, request } from '../../shared/api/http';
import type {
  Attachment,
  ListParams,
  PageResult,
  Person,
  SaveSignRequestInput,
  SignRequestDetail,
  SignRequestSummary,
} from '../../shared/api/types';

const SR = '/sign-requests';
const note = (n?: string) => ({ note: n ?? '' });

/** Lời gọi `/api/sign-requests` và `/api/users`. Thông điệp lỗi (ApiError.message) đã là tiếng Việt. */
export const documentsApi = {
  users: () => request<Person[]>('GET', '/users'),
  list: (p: ListParams) =>
    request<PageResult<SignRequestSummary>>('GET', SR, {
      query: {
        scope: p.scope,
        q: p.q || undefined,
        docType: p.docType || undefined,
        unit: p.unit || undefined,
        status: p.status || undefined,
        page: p.page ?? 0,
        size: p.size ?? 10,
      },
    }),
  get: (id: number) => request<SignRequestDetail>('GET', `${SR}/${id}`),
  create: (b: SaveSignRequestInput) => request<SignRequestDetail>('POST', SR, { body: b }),
  update: (id: number, b: SaveSignRequestInput) => put<SignRequestDetail>(`${SR}/${id}`, b),
  remove: (id: number) => request<void>('DELETE', `${SR}/${id}`),
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
  downloadAttachment: (id: number, a: Pick<Attachment, 'id' | 'name'>) => download(`${SR}/${id}/attachments/${a.id}`, a.name),
};
