import { afterEach, describe, expect, it, vi } from 'vitest';
import { ApiError, errorMessage, get } from './http';

function reply(status: number, body?: unknown) {
  vi.stubGlobal(
    'fetch',
    vi.fn(async () => new Response(body === undefined ? null : JSON.stringify(body), { status })),
  );
}

afterEach(() => vi.unstubAllGlobals());

describe('http (ApiError từ RFC 7807)', () => {
  it('ghép errors[] theo trường', async () => {
    reply(400, {
      code: 'VALIDATION_ERROR',
      detail: 'Dữ liệu không hợp lệ',
      errors: [
        { field: 'name', message: 'Bắt buộc' },
        { field: '', message: 'Ngày sai' },
      ],
    });
    const e = (await get('/x').catch((err) => err)) as ApiError;
    expect(e).toBeInstanceOf(ApiError);
    expect(e.message).toBe('name: Bắt buộc; Ngày sai');
    expect(e.code).toBe('VALIDATION_ERROR');
    expect(e.fieldError('name')).toBe('Bắt buộc');
  });

  it('dùng detail và giữ reason, body', async () => {
    reply(422, { code: 'BUSINESS_RULE', reason: 'HAS_CHILDREN', detail: 'Còn đơn vị con', groups: [1] });
    const e = (await get('/x').catch((err) => err)) as ApiError;
    expect(e.message).toBe('Còn đơn vị con');
    expect(e.reason).toBe('HAS_CHILDREN');
    expect(e.body.groups).toEqual([1]);
  });

  it('401/403 không có body: câu mặc định tiếng Việt', async () => {
    reply(403);
    expect(errorMessage(await get('/x').catch((err) => err))).toBe('Không có quyền thực hiện');
    reply(401);
    expect(errorMessage(await get('/x').catch((err) => err))).toContain('đăng nhập');
  });

  it('lỗi mạng: câu tiếng Việt', () => {
    expect(errorMessage(new TypeError('Failed to fetch'))).toContain('Không kết nối');
  });
});
