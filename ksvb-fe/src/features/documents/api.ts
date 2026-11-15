import { keepPreviousData, useQuery, useQueryClient } from '@tanstack/react-query';
import { download, request } from '../../shared/api/http';
import { queryKeys } from '../../shared/api/queryClient';
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
        q: p.q,
        docType: p.docType,
        unit: p.unit,
        status: p.status,
        page: p.page ?? 0,
        size: p.size ?? 10,
      },
    }),
  get: (id: number) => request<SignRequestDetail>('GET', `${SR}/${id}`),
  create: (b: SaveSignRequestInput) => request<SignRequestDetail>('POST', SR, { body: b }),
  update: (id: number, b: SaveSignRequestInput) => request<SignRequestDetail>('PUT', `${SR}/${id}`, { body: b }),
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

export const useUsers = () => useQuery({ queryKey: queryKeys.users, queryFn: documentsApi.users, staleTime: 60_000 });

/** Danh sách đơn vị (lấy từ danh bạ người dùng) cho bộ lọc. */
export function useUnits(): string[] {
  const { data } = useUsers();
  return [...new Set((data ?? []).map((x) => x.unitName).filter((x): x is string => !!x))].sort();
}

export const useSignRequests = (p: ListParams) =>
  useQuery({
    queryKey: [...queryKeys.signRequests, 'list', p],
    queryFn: () => documentsApi.list(p),
    placeholderData: keepPreviousData,
  });

export const useSignRequest = (id: number) =>
  useQuery({ queryKey: [...queryKeys.signRequests, 'detail', id], queryFn: () => documentsApi.get(id) });

/** Số văn bản đang chờ tôi ký (huy hiệu ở menu, chuông). */
export const usePendingCount = (enabled = true) =>
  useQuery({
    queryKey: queryKeys.pendingCount,
    queryFn: () => documentsApi.list({ scope: 'pending', size: 1 }).then((r) => r.totalElements),
    enabled,
  }).data ?? 0;

/** Sau thao tác ghi: làm mới mọi danh sách/chi tiết văn bản, số việc chờ ký và dashboard. */
export function useRefreshDocuments() {
  const qc = useQueryClient();
  return () => {
    void qc.invalidateQueries({ queryKey: queryKeys.signRequests });
    void qc.invalidateQueries({ queryKey: queryKeys.dashboard });
  };
}
