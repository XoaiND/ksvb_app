import { Tag } from 'antd';
import type { DocStatus, SignerStatus } from '../api/types';
import { DOC_STATUS, SIGNER_STATUS } from '../format';

export const DocStatusTag = ({ status }: { status: DocStatus }) => {
  const s = DOC_STATUS[status] ?? { label: '—', color: 'default' };
  return <Tag color={s.color}>{s.label}</Tag>;
};

export const SignerStatusTag = ({ status }: { status: SignerStatus }) => {
  const s = SIGNER_STATUS[status];
  return <Tag color={s.color}>{s.label}</Tag>;
};
