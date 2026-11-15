import { useState, type CSSProperties } from 'react';
import { useNavigate } from 'react-router';
import { api } from '../api';
import Avatar from '../components/Avatar';
import { ErrorNote, Loading } from '../components/Async';
import Icon from '../components/Icon';
import { useApp } from '../context/AppContext';
import { useAsync } from '../hooks/useAsync';
import { fmtDate } from '../utils';

const MONTH_LABELS = ['T1', 'T2', 'T3', 'T4', 'T5', 'T6', 'T7', 'T8', 'T9', 'T10', 'T11', 'T12'];

function Tile({ label, value, bg, fg, tab }: { label: string; value: number; bg: string; fg: string; tab: string }) {
  const nav = useNavigate();
  return (
    <div className="tile" style={{ '--tb': bg, '--tc': fg } as CSSProperties} onClick={() => nav(`/documents?tab=${tab}`)}>
      <span>{label}</span>
      <b>{value}</b>
    </div>
  );
}

export default function Dashboard() {
  const { me, can } = useApp();
  const nav = useNavigate();
  const [year, setYear] = useState(new Date().getFullYear());
  const { data: d, error, loading, reload } = useAsync(() => api.dashboard(year), [year]);

  if (error) return <ErrorNote error={error} onRetry={reload} />;
  if (!d || !me) return <Loading />;

  const vals = [d.pendingForMe, d.inProgress, d.completed, d.rejectedOrCancelled];
  const names = ['Chờ tôi duyệt', 'Đang xử lý', 'Hoàn thành', 'Từ chối / Huỷ'];
  const cols = ['#CBE2FD', '#CBF7A7', '#044BD9', '#FFC2AC'];
  const total = vals.reduce((a, b) => a + b, 0);
  let acc = 0;
  const stops = total
    ? vals
        .map((v, i) => {
          const a = (acc / total) * 100;
          acc += v;
          return `${cols[i]} ${a}% ${(acc / total) * 100}%`;
        })
        .join(',')
    : 'var(--skel1) 0% 100%';
  const mx = Math.max(...d.completedByMonth, 1);
  const years = [year, year - 1, year - 2];

  return (
    <>
      <div className="pg-t">
        <h2>Dashboard</h2>
        {can('document.create') && (
          <button className="btn pri" onClick={() => nav('/compose')}>
            <Icon name="plus" size={16} />
            Soạn tài liệu mới
          </button>
        )}
      </div>
      <div className="grid g3" aria-busy={loading}>
        <div className="card">
          <div className="hd">
            <h3>Tổng quan văn bản</h3>
          </div>
          <div style={{ display: 'flex', gap: 16, alignItems: 'center', flexWrap: 'wrap' }}>
            <div className="donut" style={{ background: `conic-gradient(${stops})` }}>
              <span>
                {total}
                <small>văn bản</small>
              </span>
            </div>
            <div className="lg">
              {vals.map((v, i) => (
                <div key={i}>
                  <i style={{ background: cols[i] }} />
                  {names[i]}
                  <b>{v}</b>
                </div>
              ))}
            </div>
          </div>
        </div>
        <div className="card">
          <div className="hd">
            <h3>Tài liệu của tôi</h3>
            <a className="btn link" style={{ fontWeight: 600 }} onClick={() => nav('/documents?tab=1')}>
              Xem tất cả →
            </a>
          </div>
          <div className="grid g2 keep2" style={{ gap: 10 }}>
            <Tile label="Tài liệu chờ duyệt" value={d.pendingForMe} bg="#CEEFFE" fg="#0C80F4" tab="1" />
            <Tile label="Tài liệu cá nhân" value={d.mine} bg="#F3E7F9" fg="#A968D1" tab="2" />
            <Tile label="Tài liệu chung" value={d.shared} bg="#E7FBD2" fg="#2E9919" tab="3" />
            <Tile label="Khác" value={d.expired} bg="#FFF5E6" fg="#F8993B" tab="2" />
          </div>
        </div>
        <div className="card">
          <div className="hd">
            <h3>Thông tin cá nhân</h3>
          </div>
          <div style={{ display: 'flex', gap: 12, alignItems: 'center', marginBottom: 10 }}>
            <Avatar id={me.id} name={me.fullName} size={48} />
            <div>
              <b>{me.fullName}</b>
              <div style={{ color: 'var(--link)' }}>{me.email}</div>
            </div>
          </div>
          <div className="mut">Đơn vị</div>
          <div style={{ marginBottom: 6 }}>{me.unitName ?? '—'}</div>
          <div className="mut">Vị trí công việc</div>
          <div style={{ marginBottom: 6 }}>{me.jobTitle ?? '—'}</div>
          <div className="mut">Quyền ký</div>
          <div style={{ color: can('document.sign') ? 'var(--ok)' : 'var(--mut)', fontWeight: 600 }}>
            {can('document.sign') ? 'Được phép ký văn bản' : 'Chưa được cấp quyền ký'}
          </div>
        </div>
      </div>
      <div className="grid g21" style={{ marginTop: 16 }}>
        <div className="card">
          <div className="hd">
            <h3>Báo cáo văn bản hoàn tất theo tháng</h3>
            <select aria-label="Năm" value={year} onChange={(e) => setYear(+e.target.value)}>
              {years.map((y) => (
                <option key={y} value={y}>
                  {y}
                </option>
              ))}
            </select>
          </div>
          <div className="bars">
            {d.completedByMonth.map((v, i) => (
              <div key={i}>
                <span>{v}</span>
                <i style={{ height: `${(v / mx) * 80}%` }} />
                <span>{MONTH_LABELS[i]}</span>
              </div>
            ))}
          </div>
        </div>
        <div className="card">
          <div className="hd">
            <h3>Việc cần xử lý ngay</h3>
          </div>
          {d.todo.length === 0 && <div className="empty">Không có việc cần ký</div>}
          {d.todo.map((t) => (
            <div className="flowi" key={t.id}>
              <div className="who">
                <b style={{ cursor: 'pointer', color: 'var(--link)' }} onClick={() => nav(`/documents/${t.id}`)}>
                  {t.title}
                </b>
                <small>
                  {t.code} · từ {t.creator.fullName} · hạn {fmtDate(t.deadline)}
                </small>
              </div>
              <button className="btn pri sm" onClick={() => nav(`/documents/${t.id}/sign`)}>
                <Icon name="pen" size={14} />
                Ký ngay
              </button>
            </div>
          ))}
        </div>
      </div>
    </>
  );
}
