import { QueryClient } from '@tanstack/react-query';
import { ApiError } from './http';

/** Lỗi 4xx (thiếu quyền, không tồn tại, dữ liệu sai) không thử lại; lỗi mạng/5xx thử lại 1 lần. */
export function createQueryClient(): QueryClient {
  return new QueryClient({
    defaultOptions: {
      queries: {
        retry: (count, err) => !(err instanceof ApiError && err.status < 500) && count < 1,
        refetchOnWindowFocus: false,
        staleTime: 10_000,
      },
      mutations: { retry: false },
    },
  });
}
