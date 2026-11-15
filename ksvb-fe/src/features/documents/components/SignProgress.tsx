import { Progress, Typography } from 'antd';
import type { DocStatus } from '../../../shared/api/types';

export default function SignProgress({ signed, total, status }: { signed: number; total: number; status: DocStatus }) {
  const bad = status === 'REJECTED' || status === 'CANCELLED';
  return (
    <div style={{ minWidth: 100 }}>
      <Progress
        percent={total ? Math.round((signed / total) * 100) : 0}
        size="small"
        showInfo={false}
        status={bad ? 'exception' : 'normal'}
      />
      <Typography.Text type="secondary" style={{ fontSize: 12 }}>
        {signed}/{total} đã ký
      </Typography.Text>
    </div>
  );
}
