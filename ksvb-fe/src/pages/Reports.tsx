import { api } from '../api';
import { ErrorNote, Loading } from '../components/Async';
import { useApp } from '../context/AppContext';
import { useAsync } from '../hooks/useAsync';

const num = (n: number, digits = 1) => n.toFixed(digits).replace('.', ',');

export default function Reports() {
  const { can } = useApp();
  const allowed = can('report.view');
  const { data: r, error, reload } = useAsync(() => (allowed ? api.report() : Promise.reject(new Error('Bạn chưa được cấp quyền xem báo cáo (report.view).'))), [allowed]);

  if (error) return <ErrorNote error={error} onRetry={allowed ? reload : undefined} />;
  if (!r) return <Loading />;

  const units = Object.entries(r.byUnit);
  const max = Math.max(...units.map(([, v]) => v), 1);

  return (
    <>
      <div className="pg-t"><h2>Báo cáo</h2></div>
      <div className="grid g4">
        <div className="card kpi"><small>Tổng văn bản</small><b>{r.total}</b></div>
        <div className="card kpi"><small>Thời gian ký trung bình</small><b>{num(r.avgSignHours / 24)} ngày</b></div>
        <div className="card kpi"><small>Tỷ lệ hoàn thành đúng hạn</small><b style={{ color: 'var(--ok)' }}>{num(r.onTimeRate)}%</b></div>
        <div className="card kpi"><small>Văn bản quá hạn</small><b style={{ color: 'var(--bad)' }}>{r.overdue}</b></div>
      </div>
      <div className="grid g2" style={{ marginTop: 16 }}>
        <div className="card">
          <h3>Văn bản theo đơn vị</h3>
          {units.length === 0 && <div className="empty">Chưa có dữ liệu</div>}
          {units.map(([n, v]) => (
            <div className="hbar" key={n}>
              <span className="l">{n}</span>
              <div style={{ flex: 1 }}><i style={{ width: `${(v / max) * 100}%` }} /></div>
              <span className="v">{v}</span>
            </div>
          ))}
        </div>
        <div className="card">
          <h3>Người ký chậm nhất</h3>
          {r.slowestSigners.length === 0 ? <div className="empty">Chưa có dữ liệu</div> : (
            <div className="scroll">
              <table className="tbl">
                <thead><tr><th>Người ký</th><th>Chờ ký TB</th><th>Quá hạn</th></tr></thead>
                <tbody>
                  {r.slowestSigners.map((s) => (
                    <tr key={s.fullName}><td>{s.fullName}</td><td>{num(s.avgWaitHours / 24)} ngày</td><td>{s.overdue}</td></tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>
    </>
  );
}
