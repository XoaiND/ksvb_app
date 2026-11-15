import { useEffect, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router';
import { api, type DocStatus, type Scope, type SignRequestSummary } from '../api';
import { ErrorNote, Loading } from '../components/Async';
import Icon from '../components/Icon';
import Modal from '../components/Modal';
import Progress from '../components/Progress';
import { DocStatusTag, SignerStatusTag } from '../components/Tag';
import { useApp } from '../context/AppContext';
import { useAsync } from '../hooks/useAsync';
import { DOC_ST, DOC_TYPES, errorText, fmtDate } from '../utils';

type Tab = '1' | '2' | '3';
const TABS: [Tab, string, Scope][] = [
  ['1', 'Tài liệu chờ duyệt', 'pending'],
  ['2', 'Tài liệu cá nhân', 'mine'],
  ['3', 'Tài liệu chung', 'shared'],
];
const EMPTY = { q: '', docType: '', unit: '', status: '' as DocStatus | '' };
const PAGE_SIZE = 10;

export function useUnits(): string[] {
  const [units, setUnits] = useState<string[]>([]);
  useEffect(() => {
    api
      .users()
      .then((u) => setUnits([...new Set(u.map((x) => x.unitName).filter(Boolean))].sort()))
      .catch(() => undefined);
  }, []);
  return units;
}

export default function Documents() {
  const { me, can, pendingCount, refreshPending, toast } = useApp();
  const nav = useNavigate();
  const [params, setParams] = useSearchParams();
  const tab: Tab = (['1', '2', '3'] as string[]).includes(params.get('tab') ?? '') ? (params.get('tab') as Tab) : '1';
  const scope = TABS.find((t) => t[0] === tab)![2];
  const units = useUnits();

  const [draft, setDraft] = useState({ ...EMPTY, q: params.get('q') ?? '' });
  const [applied, setApplied] = useState({ ...EMPTY, q: params.get('q') ?? '' });
  const [page, setPage] = useState(0);
  const [confirm, setConfirm] = useState<{ kind: 'cancel' | 'delete'; doc: SignRequestSummary } | null>(null);
  const [reason, setReason] = useState('');
  const [busy, setBusy] = useState(false);

  // Đổi tab hoặc bộ lọc thì về trang đầu.
  useEffect(() => setPage(0), [tab, applied]);

  const { data, error, loading, reload } = useAsync(
    () =>
      api.listSignRequests({
        scope,
        q: applied.q,
        docType: applied.docType,
        unit: applied.unit,
        status: applied.status,
        page,
        size: PAGE_SIZE,
      }),
    [scope, applied, page],
  );

  const set = (k: keyof typeof EMPTY, v: string) => setDraft((f) => ({ ...f, [k]: v }));

  const doConfirm = async () => {
    if (!confirm) return;
    if (confirm.kind === 'cancel' && !reason.trim()) return toast('Cần nhập lý do huỷ', true);
    setBusy(true);
    try {
      if (confirm.kind === 'cancel') {
        await api.cancel(confirm.doc.id, reason.trim());
        toast('Đã huỷ tài liệu');
      } else {
        await api.deleteSignRequest(confirm.doc.id);
        toast('Đã xoá bản nháp');
      }
      setConfirm(null);
      setReason('');
      reload();
      refreshPending();
    } catch (e) {
      toast(errorText(e), true);
    } finally {
      setBusy(false);
    }
  };

  const mine = (d: SignRequestSummary) => d.creator.id === me?.id;

  const rowActs = (d: SignRequestSummary) => (
    <div className="acts">
      {d.canSign && can('document.sign') && (
        <button className="btn pri sm" onClick={() => nav(`/documents/${d.id}/sign`)}>
          <Icon name="pen" size={14} />
          Ký
        </button>
      )}
      <button className="btn ico" title="Xem" aria-label="Xem" onClick={() => nav(`/documents/${d.id}`)}>
        <Icon name="eye" size={16} />
      </button>
      {d.status === 'DRAFT' && mine(d) && can('document.create') && (
        <>
          <button className="btn ico" title="Sửa" aria-label="Sửa" onClick={() => nav(`/compose?id=${d.id}`)}>
            <Icon name="edit" size={16} />
          </button>
          <button className="btn ico dan" title="Xoá" aria-label="Xoá" onClick={() => setConfirm({ kind: 'delete', doc: d })}>
            <Icon name="trash" size={16} />
          </button>
        </>
      )}
      {d.status === 'PENDING' && mine(d) && can('document.create') && (
        <button className="btn ico dan" title="Huỷ" aria-label="Huỷ" onClick={() => setConfirm({ kind: 'cancel', doc: d })}>
          <Icon name="ban" size={16} />
        </button>
      )}
    </div>
  );

  let body;
  if (error) body = <ErrorNote error={error} onRetry={reload} />;
  else if (!data) body = <Loading />;
  else if (data.content.length === 0) {
    body = (
      <div className="empty">
        <Icon name="file" size={44} />
        <p>Không có tài liệu nào phù hợp</p>
        {can('document.create') && (
          <button className="btn pri" onClick={() => nav('/compose')}>
            <Icon name="plus" size={16} />
            Soạn tài liệu mới
          </button>
        )}
      </div>
    );
  } else {
    const { totalElements, totalPages } = data;
    body = (
      <>
        <div className="scroll" aria-busy={loading}>
          <table className="tbl resp">
            <thead>
              <tr>
                <th>Tiêu đề</th>
                <th>Loại</th>
                <th>Đơn vị</th>
                <th>Người tạo</th>
                <th>Ngày trình</th>
                <th>Hạn ký</th>
                <th>Tiến độ</th>
                <th>Trạng thái</th>
                <th />
              </tr>
            </thead>
            <tbody>
              {data.content.map((d) => (
                <tr key={d.id}>
                  <td className="nolbl t">
                    <a onClick={() => nav(`/documents/${d.id}`)}>{d.title}</a>
                    <div className="mut" style={{ fontWeight: 400, fontSize: 12 }}>
                      {d.code ?? 'Chưa có số hiệu'}
                      {d.priority === 'URGENT' && (
                        <>
                          {' '}
                          · <span style={{ color: 'var(--bad)' }}>Khẩn</span>
                        </>
                      )}
                    </div>
                  </td>
                  <td data-l="Loại">{d.docType}</td>
                  <td data-l="Đơn vị">{d.unitName ?? '—'}</td>
                  <td data-l="Người tạo">{d.creator.fullName}</td>
                  <td data-l="Ngày trình">{fmtDate(d.submittedAt)}</td>
                  <td data-l="Hạn ký">{fmtDate(d.deadline)}</td>
                  <td data-l="Tiến độ">
                    <Progress signed={d.signedCount} total={d.signerCount} status={d.status} />
                  </td>
                  <td data-l="Trạng thái">
                    {tab === '1' ? <SignerStatusTag status="PENDING" /> : <DocStatusTag status={d.status} />}
                  </td>
                  <td className="nolbl">{rowActs(d)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <div className="pager">
          <span>{totalElements} tài liệu</span>
          <b onClick={() => page > 0 && setPage(page - 1)} aria-label="Trang trước">
            ‹
          </b>
          {Array.from({ length: totalPages }, (_, i) => i)
            .slice(Math.max(0, page - 2), page + 3)
            .map((i) => (
              <b key={i} className={i === page ? 'on' : ''} onClick={() => setPage(i)}>
                {i + 1}
              </b>
            ))}
          <b onClick={() => page + 1 < totalPages && setPage(page + 1)} aria-label="Trang sau">
            ›
          </b>
        </div>
      </>
    );
  }

  return (
    <>
      <div className="pg-t">
        <h2>Lưu trữ tài liệu</h2>
      </div>
      <div className="card">
        <div className="tabs">
          {TABS.map(([k, t]) => (
            <button key={k} className={tab === k ? 'on' : ''} onClick={() => setParams({ tab: k })}>
              {t}
              {k === '1' ? ` (${pendingCount})` : ''}
            </button>
          ))}
        </div>
        <div className="flt">
          <input
            type="text"
            placeholder="Tìm tiêu đề, mã hiệu"
            aria-label="Tìm tiêu đề, mã hiệu"
            value={draft.q}
            onChange={(e) => set('q', e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && setApplied(draft)}
          />
          <select aria-label="Loại văn bản" value={draft.docType} onChange={(e) => set('docType', e.target.value)}>
            <option value="">Loại văn bản</option>
            {DOC_TYPES.map((t) => (
              <option key={t}>{t}</option>
            ))}
          </select>
          <select aria-label="Đơn vị" value={draft.unit} onChange={(e) => set('unit', e.target.value)}>
            <option value="">Đơn vị</option>
            {units.map((t) => (
              <option key={t}>{t}</option>
            ))}
          </select>
          <select aria-label="Trạng thái" value={draft.status} onChange={(e) => set('status', e.target.value)}>
            <option value="">Trạng thái</option>
            {(Object.keys(DOC_ST) as DocStatus[]).map((k) => (
              <option key={k} value={k}>
                {DOC_ST[k][0]}
              </option>
            ))}
          </select>
          <button className="btn pri" onClick={() => setApplied(draft)}>
            <Icon name="search" size={16} />
            Tìm kiếm
          </button>
          <button
            className="btn"
            onClick={() => {
              setDraft({ ...EMPTY });
              setApplied({ ...EMPTY });
            }}
          >
            Đặt lại
          </button>
        </div>
        {body}
      </div>
      {confirm && (
        <Modal
          title={confirm.kind === 'cancel' ? 'Huỷ tài liệu' : 'Xoá bản nháp'}
          onClose={() => {
            setConfirm(null);
            setReason('');
          }}
          footer={
            <>
              <button
                className="btn"
                onClick={() => {
                  setConfirm(null);
                  setReason('');
                }}
              >
                Không
              </button>
              <button className="btn dan fill" disabled={busy} onClick={doConfirm}>
                {confirm.kind === 'cancel' ? 'Huỷ tài liệu' : 'Xoá'}
              </button>
            </>
          }
        >
          {confirm.kind === 'cancel' ? (
            <>
              <p>
                Huỷ <b>{confirm.doc.title}</b>? Các người ký sẽ nhận thông báo và luồng ký dừng lại.
              </p>
              <div className="fld">
                <label htmlFor="cancel-reason">
                  Lý do huỷ <em>*</em>
                </label>
                <textarea id="cancel-reason" rows={3} value={reason} onChange={(e) => setReason(e.target.value)} />
              </div>
            </>
          ) : (
            <p>
              Xoá vĩnh viễn <b>{confirm.doc.title}</b>?
            </p>
          )}
        </Modal>
      )}
    </>
  );
}
