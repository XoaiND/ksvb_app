import type { CSSProperties } from 'react';
import type { DocStatus, SignerStatus } from '../api';
import { AP_ST, DOC_ST, type TagColor } from '../utils';

export function Tag({ color }: { color: TagColor }) {
  const style = { '--tb': color[1], '--tc': color[2] } as CSSProperties;
  return (
    <span className="tag" style={style}>
      {color[0]}
    </span>
  );
}

export const DocStatusTag = ({ status }: { status: DocStatus }) => <Tag color={DOC_ST[status] ?? ['—', '#D1D1D6', '#6B7280']} />;
export const SignerStatusTag = ({ status }: { status: SignerStatus }) => <Tag color={AP_ST[status]} />;
