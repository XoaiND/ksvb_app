import { download, put, request, seg } from '../../shared/api/http';
import type {
  Attachment,
  PageImage,
  ListParams,
  PageResult,
  Person,
  SaveSignRequestInput,
  SignRequestDetail,
  SignRequestSummary,
  SignerSignature,
  SignSlot,
  SlotLayout,
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
  get: (id: number) => request<SignRequestDetail>('GET', `${SR}/${seg(id)}`),
  create: (b: SaveSignRequestInput) => request<SignRequestDetail>('POST', SR, { body: b }),
  update: (id: number, b: SaveSignRequestInput) => put<SignRequestDetail>(`${SR}/${seg(id)}`, b),
  remove: (id: number) => request<void>('DELETE', `${SR}/${seg(id)}`),
  submit: (id: number) => request<SignRequestDetail>('POST', `${SR}/${seg(id)}/submit`),
  /** Ký; máy chủ đóng ảnh chữ ký vào các ô của người ký (kèm họ tên + thời gian nếu showCaption). */
  sign: (id: number, n?: string, showCaption = true) =>
    request<SignRequestDetail>('POST', `${SR}/${seg(id)}/sign`, { body: { ...note(n), showCaption } }),
  reject: (id: number, reason: string) => request<SignRequestDetail>('POST', `${SR}/${seg(id)}/reject`, { body: note(reason) }),
  cancel: (id: number, reason: string) => request<SignRequestDetail>('POST', `${SR}/${seg(id)}/cancel`, { body: note(reason) }),
  recall: (id: number) => request<SignRequestDetail>('POST', `${SR}/${seg(id)}/recall`),
  remind: (id: number) => request<void>('POST', `${SR}/${seg(id)}/remind`),
  uploadAttachment: (id: number, file: File, signable: boolean) => {
    const form = new FormData();
    form.append('file', file);
    return request<Attachment>('POST', `${SR}/${seg(id)}/attachments`, { form, query: { signable } });
  },
  removeAttachment: (id: number, attachmentId: number) =>
    request<void>('DELETE', `${SR}/${seg(id)}/attachments/${seg(attachmentId)}`),
  /** Ô ký (annotation trong PDF) + kích thước trang của một tệp cần ký. */
  slots: (id: number, attachmentId: number) =>
    request<SlotLayout>('GET', `${SR}/${seg(id)}/attachments/${seg(attachmentId)}/slots`),
  /** Ghi lại toàn bộ ô ký vào tệp PDF. */
  saveSlots: (id: number, attachmentId: number, slots: SignSlot[]) =>
    put<SlotLayout>(`${SR}/${seg(id)}/attachments/${seg(attachmentId)}/slots`, { slots }),
  /** Ảnh một trang (JPEG data URL): bản đang có hiệu lực, hoặc bản gốc (`original`). */
  page: (id: number, attachmentId: number, page: number, original = false) =>
    request<PageImage>('GET', `${SR}/${seg(id)}/attachments/${seg(attachmentId)}/pages/${page}`, {
      query: { original: original || undefined },
    }),
  /** Ảnh chữ ký của từng người ký (null = chưa tải ảnh), để xem trước ô ký. */
  signerSignatures: (id: number) => request<SignerSignature[]>('GET', `${SR}/${seg(id)}/signer-signatures`),
  /** Tải tệp gốc, hoặc bản đã đóng chữ ký (`signed`). */
  downloadAttachment: (id: number, a: Pick<Attachment, 'id' | 'name'>, signed = false) =>
    download(
      `${SR}/${seg(id)}/attachments/${seg(a.id)}${signed ? '?signed=true' : ''}`,
      signed ? a.name.replace(/(\.pdf)?$/i, ' (đã ký)$1') : a.name,
    ),
};
