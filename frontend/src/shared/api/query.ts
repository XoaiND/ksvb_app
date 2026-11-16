import { useEffect } from 'react';
import { keepPreviousData, useQuery, type QueryKey } from '@tanstack/react-query';
import { App } from 'antd';
import { errorMessage } from './http';

interface ApiQueryOptions {
  enabled?: boolean;
  /** true: lỗi không hiện thông báo (thay cho `.catch(() => undefined)` trước đây). */
  silent?: boolean;
  /** Giữ dữ liệu của khoá trước trong lúc tải khoá mới (đổi trang, bộ lọc). Mặc định true như trước đây. */
  keepPrevious?: boolean;
}

/** useQuery (cấu hình chung ở queryClient.ts) + hiện `message.error(errorMessage(e))` khi lỗi (trừ khi `silent`). */
export function useApiQuery<T>(key: QueryKey, fn: () => Promise<T>, opts: ApiQueryOptions = {}) {
  const { message } = App.useApp();
  const q = useQuery({
    queryKey: key,
    queryFn: fn,
    enabled: opts.enabled ?? true,
    placeholderData: opts.keepPrevious === false ? undefined : keepPreviousData,
  });
  useEffect(() => {
    if (q.error && !opts.silent) message.error(errorMessage(q.error));
  }, [q.error, opts.silent, message]);
  return q;
}
