import { useQueryClient } from '@tanstack/react-query';
import { useApiQuery } from '../../shared/api/query';
import { meApi } from './api';

const signatureKey = ['me', 'signature'] as const;

/** Ảnh chữ ký đã lưu; chỉ tải khi `/api/me` báo đã có. */
export const useMySignature = (enabled: boolean) =>
  useApiQuery(signatureKey, meApi.signature, { enabled, silent: true, keepPrevious: false });

/** Sau khi lưu/xoá chữ ký: làm mới `/api/me` (hasSignature) và ảnh. */
export function useRefreshSignature() {
  const qc = useQueryClient();
  return () => {
    void qc.invalidateQueries({ queryKey: ['me'] });
  };
}
