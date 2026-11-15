import { useState } from 'react';
import { useNavigate } from 'react-router';
import { api, type SignMode } from '../api';
import Avatar from '../components/Avatar';
import { ErrorNote, Loading } from '../components/Async';
import Icon from '../components/Icon';
import Modal from '../components/Modal';
import PersonPickerModal from '../components/PersonPickerModal';
import { Tag } from '../components/Tag';
import { useApp } from '../context/AppContext';
import { useAsync } from '../hooks/useAsync';
import { errorText } from '../utils';

export default function Templates() {
  const { me, toast } = useApp();
  const nav = useNavigate();
  const { data, error, reload } = useAsync(() => Promise.all([api.templates(), api.users()]), []);
  const [open, setOpen] = useState(false);
  const [picking, setPicking] = useState(false);
  const [name, setName] = useState('');
  const [mode, setMode] = useState<SignMode>('SEQ');
  const [signers, setSigners] = useState<number[]>([]);
  const [busy, setBusy] = useState(false);

  if (error) return <ErrorNote error={error} onRetry={reload} />;
  if (!data) return <Loading />;
  const [templates, people] = data;
  const candidates = people.filter((p) => p.id !== me?.id);
  const nameOf = (id: number) => people.find((p) => p.id === id)?.fullName ?? `#${id}`;

  const close = () => {
    setOpen(false);
    setName('');
    setSigners([]);
    setMode('SEQ');
  };

  const save = async () => {
    if (!name.trim()) return toast('Nhập tên mẫu', true);
    if (signers.length === 0) return toast('Chọn ít nhất một người ký', true);
    setBusy(true);
    try {
      await api.createTemplate({ name: name.trim(), mode, signerIds: signers });
      toast('Đã tạo mẫu');
      close();
      reload();
    } catch (e) {
      toast(errorText(e), true);
    } finally {
      setBusy(false);
    }
  };

  const remove = async (id: number) => {
    try {
      await api.deleteTemplate(id);
      toast('Đã xoá mẫu');
      reload();
    } catch (e) {
      toast(errorText(e), true);
    }
  };

  return (
    <>
      <div className="pg-t">
        <h2>Danh sách người nhận mẫu</h2>
        <button className="btn pri" onClick={() => setOpen(true)}>
          <Icon name="plus" size={16} />
          Tạo mẫu mới
        </button>
      </div>
      {templates.length === 0 && <div className="card empty">Chưa có mẫu nào. Bấm “Tạo mẫu mới”.</div>}
      <div className="grid g3">
        {templates.map((t) => (
          <div className="card" key={t.id}>
            <div className="hd">
              <h3>{t.name}</h3>
              <Tag color={[t.mode === 'SEQ' ? 'Tuần tự' : 'Song song', '#CEEFFE', '#0C80F4']} />
            </div>
            {t.signers.map((p, i) => (
              <div className="flowi" style={{ padding: '6px 0' }} key={p.id}>
                <Avatar id={p.id} name={p.fullName} size={28} />
                <div className="who">
                  <b>
                    {t.mode === 'SEQ' ? `${i + 1}. ` : ''}
                    {p.fullName}
                  </b>
                  <small>{p.jobTitle}</small>
                </div>
              </div>
            ))}
            <div className="mut" style={{ margin: '8px 0' }}>
              Đã dùng {t.usedCount} lần
            </div>
            <div style={{ display: 'flex', gap: 8 }}>
              <button className="btn pri sm" onClick={() => nav('/compose', { state: { templateId: t.id } })}>
                Dùng mẫu
              </button>
              <button className="btn sm dan" onClick={() => remove(t.id)}>
                Xoá
              </button>
            </div>
          </div>
        ))}
      </div>
      {open && !picking && (
        <Modal
          title="Tạo danh sách người nhận mẫu"
          onClose={close}
          footer={
            <>
              <button className="btn" onClick={close}>
                Huỷ
              </button>
              <button className="btn pri" disabled={busy} onClick={save}>
                Lưu mẫu
              </button>
            </>
          }
        >
          <div className="fld">
            <label htmlFor="tplName">Tên mẫu</label>
            <input
              id="tplName"
              type="text"
              style={{ width: '100%' }}
              placeholder="Ví dụ: Tờ trình ngân sách"
              value={name}
              onChange={(e) => setName(e.target.value)}
            />
          </div>
          <div className="fld">
            <label htmlFor="tplMode">Cách ký</label>
            <select id="tplMode" style={{ width: '100%' }} value={mode} onChange={(e) => setMode(e.target.value as SignMode)}>
              <option value="SEQ">Tuần tự</option>
              <option value="PAR">Song song</option>
            </select>
          </div>
          <div className="fld">
            <label>Người ký</label>
            {signers.map((id, i) => (
              <span className="chip" key={id}>
                {mode === 'SEQ' ? `${i + 1}. ` : ''}
                {nameOf(id)}
                <button aria-label={`Bỏ ${nameOf(id)}`} onClick={() => setSigners(signers.filter((x) => x !== id))}>
                  <Icon name="x" size={14} />
                </button>
              </span>
            ))}
            <div>
              <button className="btn sm" onClick={() => setPicking(true)}>
                <Icon name="plus" size={14} />
                Thêm người ký
              </button>
            </div>
          </div>
        </Modal>
      )}
      {open && picking && (
        <PersonPickerModal
          title="Chọn người ký cho mẫu"
          people={candidates}
          exclude={signers}
          onClose={() => setPicking(false)}
          onPick={(ids) => {
            setSigners([...signers, ...ids]);
            setPicking(false);
          }}
        />
      )}
    </>
  );
}
