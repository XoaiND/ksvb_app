/** Kiểu dữ liệu khớp DTO của ksvb-be (ksvb-be/src/main/java/vn/vbi/ksvb/web/Dtos.java). Ngày là chuỗi ISO. */

export type DocStatus = 'DRAFT' | 'PENDING' | 'COMPLETED' | 'REJECTED' | 'CANCELLED' | 'EXPIRED';
export type SignerStatus = 'WAITING' | 'PENDING' | 'SIGNED' | 'REJECTED';
export type SignMode = 'SEQ' | 'PAR';
export type Priority = 'NORMAL' | 'HIGH' | 'URGENT';
export type Scope = 'pending' | 'mine' | 'shared' | 'watching';

export interface Me {
  id: number;
  fullName: string;
  email: string;
  employeeCode?: string;
  unitName?: string;
  jobTitle?: string;
  permissions: string[];
}

export interface Person {
  id: number;
  fullName: string;
  email: string;
  unitName: string;
  jobTitle?: string;
  role?: 'USER' | 'ADMIN';
  active: boolean;
}

export interface Participant {
  userId: number;
  fullName: string;
  jobTitle?: string;
  unitName?: string;
  orderNo: number;
  status: SignerStatus;
  signedAt?: string;
  note?: string;
}

export interface Attachment {
  id: number;
  name: string;
  sizeBytes: number;
  signable: boolean;
  uploadedAt: string;
}

export interface SignRequestSummary {
  id: number;
  code?: string;
  title: string;
  docType: string;
  unitName?: string;
  creator: Person;
  priority: Priority;
  mode: SignMode;
  status: DocStatus;
  shared: boolean;
  deadline?: string;
  submittedAt?: string;
  signedCount: number;
  signerCount: number;
  canSign: boolean;
}

export interface SignRequestDetail {
  id: number;
  code?: string;
  title: string;
  docType: string;
  unitName?: string;
  description?: string;
  message?: string;
  cancellationReason?: string;
  creator: Person;
  priority: Priority;
  mode: SignMode;
  status: DocStatus;
  shared: boolean;
  deadline?: string;
  submittedAt?: string;
  completedAt?: string;
  participants: Participant[];
  watchers: Person[];
  attachments: Attachment[];
  canSign: boolean;
  canCancel: boolean;
  canRecall: boolean;
  canDelete: boolean;
  canEdit: boolean;
}

/** Dạng trang chung (`PageResponse` của BE, ECOSYSTEM.md 12.2): `page` đếm từ 0. */
export interface PageResult<T> {
  content: T[];
  page: number;
  size: number;
  totalElements: number;
  totalPages: number;
}

export interface SaveSignRequestInput {
  title: string;
  docType: string;
  description?: string;
  priority: Priority;
  mode: SignMode;
  deadline?: string;
  message?: string;
  shared: boolean;
  signerIds: number[];
  watcherIds: number[];
}

export interface Template {
  id: number;
  name: string;
  mode: SignMode;
  usedCount: number;
  signers: Person[];
}

export interface Dashboard {
  pendingForMe: number;
  inProgress: number;
  completed: number;
  rejectedOrCancelled: number;
  mine: number;
  shared: number;
  expired: number;
  year: number;
  completedByMonth: number[];
  todo: SignRequestSummary[];
}

export interface SlowSigner {
  fullName: string;
  avgWaitHours: number;
  overdue: number;
}

export interface Report {
  total: number;
  completed: number;
  overdue: number;
  onTimeRate: number;
  avgSignHours: number;
  byUnit: Record<string, number>;
  slowestSigners: SlowSigner[];
}

export interface AuditEntry {
  id: number;
  at: string;
  actor: string;
  action: string;
  target?: string;
  detail?: string;
  /** OK = thành công, ERROR = bị chặn/thất bại. */
  result?: 'OK' | 'ERROR';
}

export interface ListParams {
  scope: Scope;
  q?: string;
  docType?: string;
  unit?: string;
  status?: DocStatus | '';
  page?: number;
  size?: number;
}
