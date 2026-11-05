import type { DocStatus, Priority, SignerStatus } from './api';

export type TagColor = [label: string, bg: string, fg: string];

export const DOC_ST: Record<DocStatus, TagColor> = {
  DRAFT: ['Nháp', '#D1D1D6', '#808991'],
  PENDING: ['Đang xử lý', '#CEEFFE', '#0C80F4'],
  COMPLETED: ['Hoàn thành', '#E7FBD2', '#45B223'],
  REJECTED: ['Từ chối', '#FFE4D5', '#FF3330'],
  CANCELLED: ['Huỷ', '#FFE4D5', '#FF3330'],
  EXPIRED: ['Hết hạn', '#D1D1D6', '#6B7280'],
};

export const AP_ST: Record<SignerStatus, TagColor> = {
  PENDING: ['Chờ duyệt', '#FEEFCC', '#FC7F02'],
  SIGNED: ['Đã ký', '#E7FBD2', '#45B223'],
  REJECTED: ['Từ chối', '#FFE4D5', '#FF3330'],
  WAITING: ['Chưa đến lượt', '#D1D1D6', '#808991'],
};

export const PRIORITY_LABEL: Record<Priority, string> = { NORMAL: 'Thường', HIGH: 'Cao', URGENT: 'Khẩn' };

/** Loại văn bản (khớp tiền tố số hiệu của backend). */
export const DOC_TYPES = ['Hợp đồng', 'Quyết định', 'Tờ trình', 'Báo giá', 'Biên bản', 'Công văn'];

export const AVATAR_COLORS = ['#044BD9', '#A968D1', '#2E9919', '#F8993B', '#0C80F4', '#E0457B', '#14A3A3', '#7C5CFA'];

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

export const errorText = (e: unknown): string => (e instanceof Error ? e.message : 'Đã xảy ra lỗi');
