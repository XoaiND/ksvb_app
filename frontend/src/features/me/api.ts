import { request } from '../../shared/api/http';
import type { Signature } from '../../shared/api/types';

const SIG = '/me/signature';
const formOf = (file: File) => {
  const form = new FormData();
  form.append('file', file);
  return form;
};

/** Ảnh chữ ký của người đang đăng nhập (`/api/me/signature`); ảnh trả về là PNG đã tách nền dạng data URL. */
export const meApi = {
  signature: () => request<Signature>('GET', SIG),
  previewSignature: (file: File) => request<Signature>('POST', `${SIG}/preview`, { form: formOf(file) }),
  saveSignature: (file: File) => request<Signature>('POST', SIG, { form: formOf(file) }),
  deleteSignature: () => request<void>('DELETE', SIG),
};
