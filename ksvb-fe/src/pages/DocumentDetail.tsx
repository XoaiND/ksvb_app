import { useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { api, type SignRequestDetail } from '../api';
import { ErrorNote, Loading } from '../components/Async';
import Icon from '../components/Icon';
import Modal from '../components/Modal';
import Paper from '../components/Paper';
import { FlowList, Timeline } from '../components/SignFlow';
import { DocStatusTag } from '../components/Tag';
import { useApp } from '../context/AppContext';
import { useAsync } from '../hooks/useAsync';
import { errorText, fmtDate, fmtDateTime, fmtSize, PRIORITY_LABEL } from '../utils';

type DetailTab = 'flow' | 'hist' | 'info';
type Dialog = 'sign' | 'reject' | 'cancel' | 'delete' | null;

export default function DocumentDetail({ signMode = false }: { signMode?: boolean }) {
  const { id } = useParams();
  const docId = Number(id);
  const { me, can, toast, refreshPending } = useApp();
  const nav = useNavigate();
  const { data: d, error, reload, loading } = useAsync(() => api.getSignRequest(docId), [docId]);
  const [tab, setTab] = useState<DetailTab>('flow');
  const [dialog, setDialog] = useState<Dialog>(null);
  const [note, setNote] = useState('');
  const [agree, setAgree] = useState(false);
  const [busy, setBusy] = useState(false);

  if (error) return <ErrorNote error={error} onRetry={reload} />;
  if (!d || !me) return <Loading />;

  const sgn = d.canSign && can('document.sign');
  const closeDialog = () => {
    setDialog(null);
    setNote('');
    setAgree(false);
  };

  /** Chạy một thao tác, báo kết quả, tải lại chi tiết và số việc chờ ký. */
  const run = async (fn: () => Promise<unknown>, ok: string, after?: () => void) => {
    setBusy(true);
    try {
      await fn();
      toast(ok);
      closeDialog();
      refreshPending();
      if (after) after();
      else reload();
    } catch (e) {
      toast(errorText(e), true);
    } finally {
      setBusy(false);
    }
  };

  const doSign = () => {
    if (!agree) return toast('Cần xác nhận đã đọc văn bản', true);
    return run(() => api.sign(d.id, note.trim() || undefined), 'Đã ký văn bản thành công');
  };
  const doReject = () => {
    if (!note.trim()) return toast('Cần nhập lý do từ chối', true);
    return run(() => api.reject(d.id, note.trim()), 'Đã từ chối ký');
  };
  const doCancel = () => {
    if (!note.trim()) return toast('Cần nhập lý do huỷ', true);
    return run(() => api.cancel(d.id, note.trim()), 'Đã huỷ tài liệu');
  };

  const download = async (a: SignRequestDetail['attachments'][number]) => {
    try {
      await api.downloadAttachment(d.id, a);
    } catch (e) {
      toast(errorText(e), true);
    }
  };

  const tabs: [DetailTab, string][] = [
    ['flow', 'Luồng ký'],
    ['hist', 'Lịch sử'],
    ['info', 'Thông tin'],
  ];
  const infoRow = (k: string, v: string) => (
    <tr>
      <td className="mut">{k}</td>
      <td>{v}</td>
    </tr>
  );
  const mine = d.creator.id === me.id;

  return (
    <>
      <div className="pg-t">
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap' }}>
          <button className="btn ico" aria-label="Quay lại" onClick={() => nav('/documents')}>
            <Icon name="back" size={16} />
          </button>
          <h2 style={{ margin: 0 }}>
            {signMode ? 'Ký: ' : ''}
            {d.title}
          </h2>
          <DocStatusTag status={d.status} />
        </div>
        <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }} aria-busy={loading || busy}>
          {signMode && (
            <>
              <button className="btn pri" disabled={!sgn} onClick={() => setDialog('sign')}>
                <Icon name="pen" size={16} />
                Ký văn bản
              </button>
              <button className="btn dan" disabled={!sgn} onClick={() => setDialog('reject')}>
                <Icon name="x" size={16} />
                Từ chối
              </button>
            </>
          )}
          {!signMode && sgn && (
            <button className="btn pri" onClick={() => nav(`/documents/${d.id}/sign`)}>
              <Icon name="pen" size={16} />
              Vào màn ký
            </button>
          )}
          {mine && d.status === 'PENDING' && can('document.create') && (
            <>
              <button
                className="btn"
                onClick={() =>
                  run(
                    () => api.remind(d.id),
                    'Đã gửi nhắc ký tới người đang chờ',
                    () => undefined,
                  )
                }
              >
                <Icon name="bell" size={16} />
                Nhắc ký
              </button>
              {d.canRecall && (
                <button className="btn" onClick={() => run(() => api.recall(d.id), 'Đã thu hồi về bản nháp')}>
                  Thu hồi
                </button>
              )}
              {d.canCancel && (
                <button className="btn dan" onClick={() => setDialog('cancel')}>
                  <Icon name="ban" size={16} />
                  Huỷ
                </button>
              )}
            </>
          )}
          {d.canEdit && can('document.create') && (
            <>
              <button className="btn" onClick={() => nav(`/compose?id=${d.id}`)}>
                <Icon name="edit" size={16} />
                Sửa
              </button>
              {d.canDelete && (
                <button className="btn dan" onClick={() => setDialog('delete')}>
                  <Icon name="trash" size={16} />
                  Xoá nháp
                </button>
              )}
            </>
          )}
        </div>
      </div>
      {d.message && (
        <div className="card" style={{ marginBottom: 16, background: 'var(--warnbg)', borderColor: 'var(--warnbd)' }}>
          <b>Lời nhắn từ {d.creator.fullName}:</b> {d.message}
        </div>
      )}
      <div className="grid g12">
        <div className="card">
          <div className="hd">
            <h3>Nội dung</h3>
          </div>
          <Paper
            title={d.title}
            code={d.code ?? 'Dự thảo'}
            participants={d.participants}
            meId={me.id}
            signMode={signMode || sgn}
          />
          <div style={{ marginTop: 14 }}>
            <b>Tệp đính kèm</b>
            {d.attachments.length === 0 && <div className="mut">Chưa có tệp</div>}
            {d.attachments.map((a) => (
              <div className="fitem" key={a.id}>
                <Icon name="file" />
                <span className="nm">{a.name}</span>
                <span className="mut">
                  {fmtSize(a.sizeBytes)}
                  {a.signable ? ' · cần ký' : ' · tham khảo'}
                </span>
                <button className="btn sm" onClick={() => download(a)}>
                  <Icon name="download" size={14} />
                  Tải xuống
                </button>
              </div>
            ))}
          </div>
        </div>
        <div className="card">
          <div className="tabs">
            {tabs.map(([k, t]) => (
              <button key={k} className={tab === k ? 'on' : ''} onClick={() => setTab(k)}>
                {t}
              </button>
            ))}
          </div>
          {tab === 'flow' && <FlowList doc={d} />}
          {tab === 'hist' && <Timeline doc={d} />}
          {tab === 'info' && (
            <table className="tbl">
              <tbody>
                {infoRow('Mã hiệu', d.code ?? '—')}
                {infoRow('Loại', d.docType)}
                {infoRow('Đơn vị', d.unitName ?? '—')}
                {infoRow('Người tạo', d.creator.fullName)}
                {infoRow('Ngày trình', fmtDateTime(d.submittedAt))}
                {infoRow('Hạn ký', fmtDate(d.deadline))}
                {infoRow('Ưu tiên', PRIORITY_LABEL[d.priority])}
                {infoRow('Cách ký', d.mode === 'SEQ' ? 'Tuần tự' : 'Song song')}
                {infoRow('Theo dõi', d.watchers.map((w) => w.fullName).join(', ') || '—')}
              </tbody>
            </table>
          )}
        </div>
      </div>

      {dialog === 'sign' && (
        <Modal
          title="Ký văn bản"
          onClose={closeDialog}
          footer={
            <>
              <button className="btn" onClick={closeDialog}>
                Huỷ
              </button>
              <button className="btn pri" disabled={busy} onClick={doSign}>
                <Icon name="pen" size={16} />
                Xác nhận ký
              </button>
            </>
          }
        >
          <p>
            Bạn sắp ký <b>{d.title}</b>.
          </p>
          <div className="fld">
            <label htmlFor="sign-note">Ghi chú (tuỳ chọn)</label>
            <textarea id="sign-note" rows={3} value={note} onChange={(e) => setNote(e.target.value)} />
          </div>
          <label style={{ display: 'flex', gap: 8, alignItems: 'flex-start' }}>
            <input type="checkbox" style={{ marginTop: 4 }} checked={agree} onChange={(e) => setAgree(e.target.checked)} />
            Tôi đã đọc và đồng ý nội dung văn bản
          </label>
        </Modal>
      )}
      {dialog === 'reject' && (
        <Modal
          title="Từ chối ký"
          onClose={closeDialog}
          footer={
            <>
              <button className="btn" onClick={closeDialog}>
                Huỷ
              </button>
              <button className="btn dan fill" disabled={busy} onClick={doReject}>
                Gửi từ chối
              </button>
            </>
          }
        >
          <div className="fld">
            <label htmlFor="reason">
              Lý do từ chối <em>*</em>
            </label>
            <textarea
              id="reason"
              rows={4}
              placeholder="Nêu rõ lý do để người soạn chỉnh sửa"
              value={note}
              onChange={(e) => setNote(e.target.value)}
            />
          </div>
        </Modal>
      )}
      {dialog === 'cancel' && (
        <Modal
          title="Huỷ tài liệu"
          onClose={closeDialog}
          footer={
            <>
              <button className="btn" onClick={closeDialog}>
                Không
              </button>
              <button className="btn dan fill" disabled={busy} onClick={doCancel}>
                Huỷ tài liệu
              </button>
            </>
          }
        >
          <p>
            Huỷ <b>{d.title}</b>? Các người ký sẽ nhận thông báo và luồng ký dừng lại.
          </p>
          <div className="fld">
            <label htmlFor="cancel-reason">
              Lý do huỷ <em>*</em>
            </label>
            <textarea id="cancel-reason" rows={3} value={note} onChange={(e) => setNote(e.target.value)} />
          </div>
        </Modal>
      )}
      {dialog === 'delete' && (
        <Modal
          title="Xoá bản nháp"
          onClose={closeDialog}
          footer={
            <>
              <button className="btn" onClick={closeDialog}>
                Không
              </button>
              <button
                className="btn dan fill"
                disabled={busy}
                onClick={() =>
                  run(
                    () => api.deleteSignRequest(d.id),
                    'Đã xoá bản nháp',
                    () => nav('/documents?tab=2'),
                  )
                }
              >
                Xoá
              </button>
            </>
          }
        >
          <p>
            Xoá vĩnh viễn <b>{d.title}</b>?
          </p>
        </Modal>
      )}
    </>
  );
}
