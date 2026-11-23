/**
 * Kiểu dữ liệu API lấy từ `schema.d.ts` (sinh bằng `npm run gen:api` từ `openapi/openapi.json` = đặc tả `/v3/api-docs` do backend xuất bằng `OpenApiExportTest`, ECOSYSTEM.md 12.3).
 * KHÔNG viết tay cho khớp DTO Java: đổi DTO ở BE thì chạy lại `gen:api`.
 */
import type { components } from './schema';

type S = components['schemas'];

export type Me = S['MeDto'];
export type Signature = S['SignatureDto'];

/** Mã quyền (client role của ksvb-api), vd. `document.create`. */
export type Permission = string;
export type Person = S['PersonDto'];
export type Participant = S['ParticipantDto'];
export type Attachment = S['AttachmentDto'];
/** Ô ký trên PDF: toạ độ trang hiển thị, point, gốc trên-trái, trang từ 1. */
export type SignSlot = S['SlotDto'];
export type SlotLayout = S['SlotLayoutDto'];
export type PageImage = S['PageImageDto'];
export type SignerSignature = S['SignerSignatureDto'];
export type SignRequestSummary = S['SignRequestSummary'];
export type SignRequestDetail = S['SignRequestDetail'];
export type SaveSignRequestInput = S['SaveSignRequest'];
export type SaveTemplateInput = S['SaveTemplate'];
export type Template = S['TemplateDto'];
export type Dashboard = S['DashboardDto'];
export type Report = S['ReportDto'];
export type SlowSigner = S['SlowSigner'];
export type AuditEntry = S['AuditDto'];

export type DocStatus = SignRequestSummary['status'];
export type SignerStatus = Participant['status'];
export type SignMode = SignRequestSummary['mode'];
export type Priority = SignRequestSummary['priority'];

/** `PageResponse` chung của hệ sinh thái: `page` đếm từ 0. */
export type PageResult<T> = {
  content: T[];
  page: number;
  size: number;
  totalElements: number;
  totalPages: number;
};

/** pending (chờ tôi ký) | mine (tôi tạo) | shared (tài liệu chung) | watching (tôi theo dõi). */
export type Scope = 'pending' | 'mine' | 'shared' | 'watching';

export interface ListParams {
  scope: Scope;
  q?: string;
  docType?: string;
  unit?: string;
  status?: DocStatus | '';
  page?: number;
  size?: number;
}
