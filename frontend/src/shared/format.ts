import type { DocStatus, Priority, SignerStatus } from './api/types';

/** Nhãn + màu trạng thái (màu là tên preset của Ant Design Tag, không ghi cứng mã màu). */
export const DOC_STATUS: Record<DocStatus, { label: string; color: string }> = {
  DRAFT: { label: 'Nháp', color: 'default' },
  PENDING: { label: 'Đang xử lý', color: 'processing' },
  COMPLETED: { label: 'Hoàn thành', color: 'success' },
  REJECTED: { label: 'Từ chối', color: 'error' },
  CANCELLED: { label: 'Huỷ', color: 'error' },
  EXPIRED: { label: 'Hết hạn', color: 'default' },
};

export const SIGNER_STATUS: Record<SignerStatus, { label: string; color: string }> = {
  PENDING: { label: 'Chờ duyệt', color: 'warning' },
  SIGNED: { label: 'Đã ký', color: 'success' },
  REJECTED: { label: 'Từ chối', color: 'error' },
  WAITING: { label: 'Chưa đến lượt', color: 'default' },
};

export const PRIORITY_LABEL: Record<Priority, string> = { NORMAL: 'Thường', HIGH: 'Cao', URGENT: 'Khẩn' };

/** Loại văn bản (khớp tiền tố số hiệu của backend). */
export const DOC_TYPES = ['Hợp đồng', 'Quyết định', 'Tờ trình', 'Báo giá', 'Biên bản', 'Công văn'];

export const initials = (name: string): string => {
  const n = name.trim().split(/\s+/);
  return ((n[n.length - 2]?.[0] ?? '') + (n[n.length - 1]?.[0] ?? '')).toUpperCase() || '?';
};

/** 2026-10-31 → 31/10/2026 */
export const fmtDate = (iso?: string | null): string => {
  if (!iso) return '—';
  const d = iso.slice(0, 10).split('-');
  return d.length === 3 ? `${d[2]}/${d[1]}/${d[0]}` : iso;
};

/** 2026-10-31T09:30:00 → 31/10/2026 09:30 */
export const fmtDateTime = (iso?: string | null): string => {
  if (!iso) return '—';
  return `${fmtDate(iso)} ${iso.slice(11, 16)}`.trim();
};

export const fmtSize = (bytes: number): string =>
  bytes < 1024 * 1024 ? `${Math.max(1, Math.round(bytes / 1024))} KB` : `${(bytes / 1048576).toFixed(1).replace('.', ',')} MB`;

export const fmtNumber = (n: number, digits = 1) => n.toFixed(digits).replace('.', ',');
