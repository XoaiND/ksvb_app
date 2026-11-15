import { Button, Result, Skeleton } from 'antd';

export function Loading() {
  return (
    <div aria-busy="true" aria-label="Đang tải">
      <Skeleton active paragraph={{ rows: 4 }} />
    </div>
  );
}

export function ErrorNote({ error, onRetry }: { error: Error; onRetry?: () => void }) {
  return (
    <div role="alert">
      <Result status="warning" title={error.message} extra={onRetry ? <Button onClick={onRetry}>Thử lại</Button> : undefined} />
    </div>
  );
}
