import { afterEach, describe, expect, it, vi } from 'vitest';
import { ApiError, request } from '../../shared/api/http';
import { documentsApi as api } from './api';
import { fail, installFetch } from '../../test/fakeBackend';

afterEach(() => vi.unstubAllGlobals());

describe('lớp gọi API', () => {
  it('gắn tiền tố /api, tham số truy vấn và header người dùng dev', async () => {
    const { calls } = installFetch({
      'GET /sign-requests': () => ({ content: [], page: 2, size: 10, totalElements: 0, totalPages: 0 }),
    });
    await api.list({ scope: 'mine', q: 'abc', status: 'DRAFT', page: 2 });
    const c = calls[0];
    expect(c.path).toBe('/sign-requests');
    expect(c.query.get('scope')).toBe('mine');
    expect(c.query.get('q')).toBe('abc');
    expect(c.query.get('status')).toBe('DRAFT');
    expect(c.query.get('page')).toBe('2');
    expect(c.headers['X-User-Id']).toBe('1'); // VITE_AUTH_DISABLED=true trong test, VITE_DEV_USER_ID mặc định 1
  });

  it('bỏ qua tham số rỗng', async () => {
    const { calls } = installFetch({
      'GET /sign-requests': () => ({ content: [], page: 0, size: 10, totalElements: 0, totalPages: 0 }),
    });
    await api.list({ scope: 'pending', q: '', docType: '', status: '' });
    expect(calls[0].query.has('q')).toBe(false);
    expect(calls[0].query.has('docType')).toBe(false);
    expect(calls[0].query.has('status')).toBe(false);
  });

  it('gửi JSON cho POST', async () => {
    const { calls } = installFetch({ 'POST /sign-requests/:id/reject': () => ({}) });
    await api.reject(7, 'Thiếu phụ lục');
    expect(calls[0].body).toEqual({ note: 'Thiếu phụ lục' });
    expect(calls[0].headers['Content-Type']).toBe('application/json');
  });

  it('204 không có nội dung trả về undefined', async () => {
    installFetch({ 'DELETE /sign-requests/:id': () => undefined });
    await expect(api.remove(3)).resolves.toBeUndefined();
  });

  it('lỗi 400 giữ lỗi theo từng trường', async () => {
    installFetch({
      'POST /sign-requests': () =>
        fail(400, 'VALIDATION_ERROR', 'Dữ liệu không hợp lệ', [{ field: 'title', message: 'Tiêu đề không được để trống' }]),
    });
    const e = await api
      .create({
        title: '',
        docType: 'Hợp đồng',
        priority: 'NORMAL',
        mode: 'SEQ',
        shared: false,
        signerIds: [1],
        watcherIds: [],
      })
      .catch((x) => x);
    expect(e).toBeInstanceOf(ApiError);
    expect(e.status).toBe(400);
    expect(e.message).toBe('title: Tiêu đề không được để trống');
    expect(e.detail).toBe('Dữ liệu không hợp lệ');
    expect(e.code).toBe('VALIDATION_ERROR');
    expect(e.errors).toEqual([{ field: 'title', message: 'Tiêu đề không được để trống' }]);
    expect(e.fieldError('title')).toBe('Tiêu đề không được để trống');
  });

  it('403 không có nội dung thì dùng thông điệp mặc định tiếng Việt', async () => {
    installFetch({ 'GET /reports/summary': () => ({ __status: 403 }) });
    await expect(request('GET', '/reports/summary')).rejects.toMatchObject({
      status: 403,
      message: 'Không có quyền thực hiện',
    });
  });
});
