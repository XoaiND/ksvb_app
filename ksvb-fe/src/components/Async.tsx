import Icon from './Icon';

export function Loading() {
  return (
    <div aria-busy="true" aria-label="Đang tải">
      <div className="skel" />
      <div className="skel" />
      <div className="skel" />
    </div>
  );
}

export function ErrorNote({ error, onRetry }: { error: Error; onRetry?: () => void }) {
  return (
    <div className="card empty" role="alert">
      <Icon name="ban" size={36} />
      <p>{error.message}</p>
      {onRetry && <button className="btn" onClick={onRetry}>Thử lại</button>}
    </div>
  );
}
