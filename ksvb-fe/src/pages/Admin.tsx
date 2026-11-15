import { useState } from 'react';
import { api } from '../api';
import Avatar from '../components/Avatar';
import { ErrorNote, Loading } from '../components/Async';
import Icon from '../components/Icon';
import { useApp } from '../context/AppContext';
import { useAsync } from '../hooks/useAsync';
import { errorText, fmtDateTime } from '../utils';

type AdminTab = 'users' | 'audit' | 'certs' | 'conf';
const TABS: [AdminTab, string, string][] = [
  ['users', 'Người dùng', 'user.manage'],
  ['audit', 'Nhật ký', 'audit.view'],
  ['certs', 'Chứng thư số', 'cert.manage'],
  ['conf', 'Cấu hình', 'config.manage'],
];

function UsersTab() {
  const { me, toast } = useApp();
  const { data, error, reload } = useAsync(() => api.adminUsers(), []);
  if (error) return <ErrorNote error={error} onRetry={reload} />;
  if (!data) return <Loading />;

  const toggle = async (id: number, active: boolean) => {
    try {
      await api.setUserActive(id, active);
      toast(active ? 'Đã kích hoạt tài khoản' : 'Đã vô hiệu hoá tài khoản');
      reload();
    } catch (e) {
      toast(errorText(e), true);
    }
  };

  return (
    <>
      <p className="mut" style={{ marginTop: 0 }}>
        Quyền của từng người (role.user / role.leader / role.admin) được gán trong Keycloak, client <code>ksvb-api</code>. Người
        dùng tự xuất hiện ở đây sau lần đăng nhập đầu tiên.
      </p>
      <div className="scroll">
        <table className="tbl resp">
          <thead>
            <tr>
              <th>Người dùng</th>
              <th>Đơn vị</th>
              <th>Email</th>
              <th>Hoạt động</th>
            </tr>
          </thead>
          <tbody>
            {data.map((p) => (
              <tr key={p.id}>
                <td className="nolbl">
                  <div style={{ display: 'flex', gap: 10, alignItems: 'center' }}>
                    <Avatar id={p.id} name={p.fullName} />
                    <div>
                      <b>{p.fullName}</b>
                      <div className="mut" style={{ fontSize: 12 }}>
                        {p.jobTitle}
                      </div>
                    </div>
                  </div>
                </td>
                <td data-l="Đơn vị">{p.unitName}</td>
                <td data-l="Email">{p.email}</td>
                <td data-l="Hoạt động">
                  <button
                    type="button"
                    role="switch"
                    aria-checked={p.active}
                    aria-label={`Hoạt động: ${p.fullName}`}
                    className={'sw' + (p.active ? ' on' : '')}
                    disabled={p.id === me?.id}
                    onClick={() => toggle(p.id, !p.active)}
                  />
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </>
  );
}

function AuditTab() {
  const [page, setPage] = useState(0);
  const { data, error, reload } = useAsync(() => api.auditLogs(page, 20), [page]);
  if (error) return <ErrorNote error={error} onRetry={reload} />;
  if (!data) return <Loading />;
  return (
    <>
      <div className="scroll">
        <table className="tbl resp">
          <thead>
            <tr>
              <th>Thời gian</th>
              <th>Người thực hiện</th>
              <th>Hành động</th>
              <th>Đối tượng</th>
              <th>Chi tiết</th>
              <th>Kết quả</th>
            </tr>
          </thead>
          <tbody>
            {data.content.map((a) => (
              <tr key={a.id}>
                <td className="nolbl">{fmtDateTime(a.at)}</td>
                <td data-l="Người thực hiện">{a.actor}</td>
                <td data-l="Hành động">{a.action}</td>
                <td data-l="Đối tượng">{a.target ?? '—'}</td>
                <td data-l="Chi tiết">{a.detail ?? '—'}</td>
                <td data-l="Kết quả">{a.result === 'ERROR' ? 'Bị chặn' : 'Thành công'}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <div className="pager">
        <span>{data.totalElements} bản ghi</span>
        <b aria-label="Trang trước" onClick={() => page > 0 && setPage(page - 1)}>
          ‹
        </b>
        <b className="on">{page + 1}</b>
        <b aria-label="Trang sau" onClick={() => page + 1 < data.totalPages && setPage(page + 1)}>
          ›
        </b>
      </div>
    </>
  );
}

function NotReady({ what }: { what: string }) {
  return (
    <div className="empty">
      <Icon name="sliders" size={40} />
      <p>{what} chưa có trong phiên bản này (backend chưa hỗ trợ).</p>
    </div>
  );
}

export default function Admin() {
  const { can } = useApp();
  const visible = TABS.filter(([, , perm]) => can(perm));
  const [tab, setTab] = useState<AdminTab | undefined>(undefined);
  const current = tab && visible.some(([k]) => k === tab) ? tab : visible[0]?.[0];

  if (!current) {
    return (
      <div className="card empty">
        <Icon name="shield" size={44} />
        <p>Bạn không có quyền truy cập trang Quản trị.</p>
      </div>
    );
  }

  return (
    <>
      <div className="pg-t">
        <h2>Quản trị</h2>
      </div>
      <div className="card">
        <div className="tabs">
          {visible.map(([k, t]) => (
            <button key={k} className={current === k ? 'on' : ''} onClick={() => setTab(k)}>
              {t}
            </button>
          ))}
        </div>
        {current === 'users' && <UsersTab />}
        {current === 'audit' && <AuditTab />}
        {current === 'certs' && <NotReady what="Quản lý chứng thư số" />}
        {current === 'conf' && <NotReady what="Cấu hình hệ thống" />}
      </div>
    </>
  );
}
