import type { DocStatus } from '../api';

export default function Progress({ signed, total, status }: { signed: number; total: number; status: DocStatus }) {
  const bad = status === 'REJECTED' || status === 'CANCELLED';
  return (
    <div style={{ minWidth: 90 }}>
      <div style={{ height: 6, background: 'var(--skel1)', borderRadius: 3 }}>
        <div style={{ height: 6, borderRadius: 3, background: bad ? '#FF7875' : '#044BD9', width: `${total ? (signed / total) * 100 : 0}%` }} />
      </div>
      <small className="mut">
        {signed}/{total} đã ký
      </small>
    </div>
  );
}
