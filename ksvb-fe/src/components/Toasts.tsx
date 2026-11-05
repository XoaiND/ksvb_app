import { useApp } from '../context/AppContext';

export default function Toasts() {
  const { toasts } = useApp();
  return (
    <div className="toasts" role="status" aria-live="polite">
      {toasts.map((t) => (
        <div key={t.id} className={'toast' + (t.err ? ' err' : '')}>
          {t.msg}
        </div>
      ))}
    </div>
  );
}
