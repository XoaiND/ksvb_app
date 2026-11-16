import type { DocStatus, Priority, SignerStatus } from '../../../shared/api/types';

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
