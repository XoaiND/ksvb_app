import { useEffect, useMemo, useRef, useState, type ChangeEvent, type DragEvent, type ReactNode } from 'react';
import { useLocation, useNavigate, useSearchParams } from 'react-router-dom';
import { api, ApiError, type Person, type Priority, type SaveSignRequestInput, type SignMode, type Template } from '../api';
import Avatar from '../components/Avatar';
import { ErrorNote, Loading } from '../components/Async';
import Icon from '../components/Icon';
import Modal from '../components/Modal';
import Paper from '../components/Paper';
import PersonPickerModal from '../components/PersonPickerModal';
import { Tag } from '../components/Tag';
import { useApp } from '../context/AppContext';
import { DOC_TYPES, errorText, fmtDate, fmtSize, PRIORITY_LABEL } from '../utils';

const STEPS = ['Thông tin & file', 'Người nhận', 'Xem lại & trình ký'];

interface FileRow {
  key: string;
  name: string;
  size: string;
  signable: boolean;
  attachmentId?: number; // đã có trên máy chủ
  file?: File; // mới chọn, chưa tải lên
}

interface Form {
  title: string;
  docType: string;
  deadline: string;
  priority: Priority;
  description: string;
  mode: SignMode;
  signers: number[];
  watchers: number[];
  message: string;
  shared: boolean;
}

const EMPTY: Form = {
  title: '', docType: DOC_TYPES[0], deadline: '', priority: 'NORMAL', description: '',
  mode: 'SEQ', signers: [], watchers: [], message: '', shared: false,
};

const ext = (name: string) => name.slice(name.lastIndexOf('.') + 1).toLowerCase();
const REF_EXT = ['pdf', 'doc', 'docx', 'xls', 'xlsx', 'png', 'zip', 'rar'];

function FileItem({ f, onRemove }: { f: FileRow; onRemove: () => void }) {
  return (
    <div className="fitem">
      <Icon name="file" />
      <span className="nm">{f.name}</span>
      <span className="mut">{f.size}</span>
      <Tag color={f.file ? ['Chờ tải lên', '#FEEFCC', '#FC7F02'] : ['Đã tải lên', '#E7FBD2', '#45B223']} />
      <button className="btn ico" onClick={onRemove} aria-label={`Bỏ ${f.name}`}><Icon name="x" size={16} /></button>
    </div>
  );
}

export default function Compose() {
  const { me, can, toast, refreshPending } = useApp();
  const nav = useNavigate();
  const loc = useLocation();
  const [params] = useSearchParams();
  const editId = params.get('id') ? Number(params.get('id')) : undefined;
  const templateId = (loc.state as { templateId?: number } | null)?.templateId;

  const [people, setPeople] = useState<Person[]>([]);
  const [templates, setTemplates] = useState<Template[]>([]);
  const [form, setForm] = useState<Form>(EMPTY);
  const [files, setFiles] = useState<FileRow[]>([]);
  const [removed, setRemoved] = useState<number[]>([]);
  const [step, setStep] = useState(1);
  const [error, setError] = useState('');
  const [loadError, setLoadError] = useState<Error>();
  const [loading, setLoading] = useState(true);
  const [confirm, setConfirm] = useState(false);
  const [busy, setBusy] = useState(false);
  const [picker, setPicker] = useState<'signers' | 'watchers' | null>(null);
  const savedId = useRef<number | undefined>(editId);
  const uploaded = useRef(new Set<string>());
  const fileIn = useRef<HTMLInputElement>(null);
  const refIn = useRef<HTMLInputElement>(null);

  const set = <K extends keyof Form>(k: K, v: Form[K]) => setForm((f) => ({ ...f, [k]: v }));
  const person = (id: number) => people.find((p) => p.id === id);
  const candidates = useMemo(() => people.filter((p) => p.id !== me?.id), [people, me]);

  useEffect(() => {
    let live = true;
    (async () => {
      try {
        const [ps, ts] = await Promise.all([api.users(), api.templates()]);
        if (!live) return;
        setPeople(ps);
        setTemplates(ts);
        if (editId) {
          const d = await api.getSignRequest(editId);
          if (!live) return;
          if (!d.canEdit) return nav(`/documents/${editId}`, { replace: true });
          setForm({
            title: d.title, docType: d.docType, deadline: d.deadline ?? '', priority: d.priority,
            description: d.description ?? '', mode: d.mode, signers: d.participants.map((p) => p.userId),
            watchers: d.watchers.map((w) => w.id), message: d.message ?? '', shared: d.shared,
          });
          setFiles(d.attachments.map((a) => ({ key: `a${a.id}`, name: a.name, size: fmtSize(a.sizeBytes), signable: a.signable, attachmentId: a.id })));
        } else if (templateId) {
          const t = ts.find((x) => x.id === templateId);
          if (t) {
            setForm((f) => ({ ...f, signers: t.signers.map((s) => s.id), mode: t.mode }));
            setStep(2);
            api.useTemplate(t.id).catch(() => undefined);
          }
        }
      } catch (e) {
        if (live) setLoadError(e instanceof Error ? e : new Error(String(e)));
      } finally {
        if (live) setLoading(false);
      }
    })();
    return () => {
      live = false;
    };
  }, [editId, templateId, nav]);

  const addFiles = (list: FileList | File[], signable: boolean) => {
    const rows: FileRow[] = [];
    for (const f of Array.from(list)) {
      const e = ext(f.name);
      if (signable && e !== 'pdf') return toast('Tệp cần ký phải là PDF', true);
      if (!signable && !REF_EXT.includes(e)) return toast('Định dạng tệp tham khảo không được hỗ trợ', true);
      if (f.size > 20 * 1024 * 1024) return toast('Tệp vượt quá 20 MB', true);
      rows.push({ key: `n${Date.now()}${rows.length}${f.name}`, name: f.name, size: fmtSize(f.size), signable, file: f });
    }
    setFiles((cur) => [...cur, ...rows]);
  };
  const onPick = (signable: boolean) => (e: ChangeEvent<HTMLInputElement>) => {
    if (e.target.files) addFiles(e.target.files, signable);
    e.target.value = '';
  };
  const onDrop = (e: DragEvent) => {
    e.preventDefault();
    addFiles(e.dataTransfer.files, true);
  };
  const removeFile = (f: FileRow) => {
    setFiles((cur) => cur.filter((x) => x.key !== f.key));
    if (f.attachmentId) setRemoved((r) => [...r, f.attachmentId!]);
  };

  const move = (i: number, d: number) => {
    const s = [...form.signers];
    const j = i + d;
    if (j < 0 || j >= s.length) return;
    [s[i], s[j]] = [s[j], s[i]];
    set('signers', s);
  };

  const applyTemplate = (id: number) => {
    const t = templates.find((x) => x.id === id);
    if (!t) return;
    setForm((f) => ({ ...f, signers: t.signers.map((s) => s.id), mode: t.mode }));
    api.useTemplate(t.id).catch(() => undefined);
    toast(`Đã áp dụng mẫu “${t.name}”`);
  };

  const signableCount = files.filter((f) => f.signable).length;

  const next = () => {
    if (step === 1 && (!form.title.trim() || signableCount === 0)) return toast('Cần nhập tiêu đề và chọn ít nhất 1 tệp PDF cần ký', true);
    if (step === 2 && form.signers.length === 0) return setError('Cần ít nhất một người ký.');
    setError('');
    setStep(step + 1);
    window.scrollTo(0, 0);
  };

  /** Lưu nháp lên máy chủ (tạo mới hoặc cập nhật), xoá tệp đã bỏ, tải tệp mới. Trả về id văn bản. */
  const persist = async (): Promise<number> => {
    const body: SaveSignRequestInput = {
      title: form.title.trim(), docType: form.docType, description: form.description || undefined,
      priority: form.priority, mode: form.mode, deadline: form.deadline || undefined,
      message: form.message || undefined, shared: form.shared, signerIds: form.signers, watcherIds: form.watchers,
    };
    const saved = savedId.current ? await api.updateSignRequest(savedId.current, body) : await api.createSignRequest(body);
    savedId.current = saved.id; // lần lưu sau (khi lỗi giữa chừng) không tạo trùng bản nháp
    for (const aid of removed) await api.removeAttachment(saved.id, aid);
    setRemoved([]);
    for (const f of files.filter((x) => x.file && !uploaded.current.has(x.key))) {
      const a = await api.uploadAttachment(saved.id, f.file!, f.signable);
      uploaded.current.add(f.key); // không tải lại nếu bước sau lỗi rồi bấm lưu lần nữa
      setFiles((cur) => cur.map((x) => (x.key === f.key ? { ...x, file: undefined, attachmentId: a.id } : x)));
    }
    return saved.id;
  };

  const fail = (e: unknown) => {
    setConfirm(false);
    if (e instanceof ApiError && e.errors) {
      setError(Object.values(e.errors).join('; '));
      toast('Dữ liệu chưa hợp lệ', true);
    } else {
      toast(errorText(e), true);
    }
  };

  const saveDraft = async () => {
    setBusy(true);
    try {
      const id = await persist();
      toast('Đã lưu bản nháp');
      nav(`/documents/${id}`);
    } catch (e) {
      fail(e);
    } finally {
      setBusy(false);
    }
  };

  const submit = async () => {
    setBusy(true);
    try {
      const id = await persist();
      await api.submit(id);
      toast('Đã trình ký, người ký đầu tiên sẽ nhận thông báo');
      refreshPending();
      nav(`/documents/${id}`);
    } catch (e) {
      fail(e);
    } finally {
      setBusy(false);
    }
  };

  if (!can('document.create')) {
    return <ErrorNote error={new Error('Bạn chưa được cấp quyền soạn và trình ký văn bản (document.create).')} />;
  }
  if (loadError) return <ErrorNote error={loadError} />;
  if (loading) return <Loading />;

  const row = (k: string, v: ReactNode) => <tr><td className="mut" style={{ width: 130 }}>{k}</td><td>{v}</td></tr>;
  const names = (ids: number[], sep: string) => ids.map((id) => person(id)?.fullName ?? `#${id}`).join(sep) || '—';

  return (
    <>
      <div className="pg-t"><h2>{editId ? 'Sửa bản nháp' : 'Soạn tài liệu mới'}</h2></div>
      <div className="steps">
        {STEPS.map((s, i) => (
          <div key={s} className={'step ' + (step === i + 1 ? 'on' : step > i + 1 ? 'done' : '')}>
            <i>{step > i + 1 ? '✓' : i + 1}</i>{s}
          </div>
        ))}
      </div>

      {step === 1 && (
        <div className="grid g21">
          <div className="card">
            <div className="fld">
              <label htmlFor="c-title">Tiêu đề <em>*</em></label>
              <input id="c-title" type="text" maxLength={250} value={form.title} onChange={(e) => set('title', e.target.value)} placeholder="Nhập tiêu đề tài liệu" />
            </div>
            <div className="grid g3" style={{ gap: 12 }}>
              <div className="fld">
                <label htmlFor="c-type">Loại văn bản</label>
                <select id="c-type" value={form.docType} onChange={(e) => set('docType', e.target.value)}>{DOC_TYPES.map((t) => <option key={t}>{t}</option>)}</select>
              </div>
              <div className="fld">
                <label htmlFor="c-deadline">Hạn ký</label>
                <input id="c-deadline" type="date" value={form.deadline} onChange={(e) => set('deadline', e.target.value)} />
              </div>
              <div className="fld">
                <label htmlFor="c-prio">Mức ưu tiên</label>
                <select id="c-prio" value={form.priority} onChange={(e) => set('priority', e.target.value as Priority)}>
                  {(Object.keys(PRIORITY_LABEL) as Priority[]).map((p) => <option key={p} value={p}>{PRIORITY_LABEL[p]}</option>)}
                </select>
              </div>
            </div>
            <div className="fld">
              <label htmlFor="c-desc">Mô tả / ghi chú</label>
              <textarea id="c-desc" rows={3} maxLength={500} value={form.description} onChange={(e) => set('description', e.target.value)} placeholder="Nội dung tóm tắt" />
            </div>
            <div className="fld">
              <label>File cần ký <em>*</em></label>
              <div className="drop" onClick={() => fileIn.current?.click()} onDragOver={(e) => e.preventDefault()} onDrop={onDrop}>
                <Icon name="upload" size={30} />
                <p style={{ margin: '6px 0 2px' }}><b>Kéo thả file vào đây</b> hoặc bấm để chọn</p>
                <small>Hỗ trợ PDF, tối đa 20 MB</small>
              </div>
              <input ref={fileIn} type="file" accept=".pdf" multiple style={{ display: 'none' }} onChange={onPick(true)} data-testid="file-input" />
              {files.filter((f) => f.signable).map((f) => <FileItem key={f.key} f={f} onRemove={() => removeFile(f)} />)}
            </div>
            <div className="fld">
              <label>File tham khảo (không ký)</label>
              {files.filter((f) => !f.signable).map((f) => <FileItem key={f.key} f={f} onRemove={() => removeFile(f)} />)}
              <input ref={refIn} type="file" multiple style={{ display: 'none' }} onChange={onPick(false)} data-testid="ref-input" />
              <button className="btn sm" onClick={() => refIn.current?.click()}><Icon name="plus" size={14} />Thêm file tham khảo</button>
            </div>
            {error && <div className="err">{error}</div>}
          </div>
          <div className="card">
            <h3>Gợi ý</h3>
            <p className="mut">Chỉ file PDF được ký. Sau khi trình ký, nội dung file không thể sửa; nếu cần sửa hãy thu hồi về nháp.</p>
            <div className="paper" style={{ maxWidth: 260, padding: 14 }}>
              <div className="ph" style={{ fontSize: 9 }}>CỘNG HÒA XÃ HỘI CHỦ NGHĨA VIỆT NAM</div>
              <h4 style={{ fontSize: 11 }}>{form.title || 'Tiêu đề'}</h4>
              {Array.from({ length: 9 }, (_, i) => <div className="ln" key={i} />)}
            </div>
          </div>
        </div>
      )}

      {step === 2 && (
        <div className="grid g21">
          <div className="card">
            <div className="hd">
              <h3>Người ký</h3>
              <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                <select aria-label="Dùng danh sách mẫu" value="" onChange={(e) => e.target.value && applyTemplate(+e.target.value)}>
                  <option value="">Dùng danh sách mẫu…</option>
                  {templates.map((t) => <option key={t.id} value={t.id}>{t.name}</option>)}
                </select>
                <button className="btn pri" onClick={() => setPicker('signers')}><Icon name="plus" size={16} />Thêm người ký</button>
              </div>
            </div>
            <div className="fld">
              <label>Cách ký</label>
              <div className="seg">
                <button className={form.mode === 'SEQ' ? 'on' : ''} onClick={() => set('mode', 'SEQ')}>Tuần tự</button>
                <button className={form.mode === 'PAR' ? 'on' : ''} onClick={() => set('mode', 'PAR')}>Song song</button>
              </div>
              <div className="mut" style={{ fontSize: 12, marginTop: 4 }}>
                {form.mode === 'SEQ' ? 'Người ký lần lượt theo thứ tự bên dưới, người sau chỉ ký khi người trước đã ký.' : 'Tất cả người ký nhận được yêu cầu cùng lúc.'}
              </div>
            </div>
            {form.signers.length === 0 && <div className="empty" style={{ padding: 24 }}>Chưa có người ký. Bấm “Thêm người ký”.</div>}
            {form.signers.map((id, i) => {
              const p = person(id);
              const name = p?.fullName ?? `#${id}`;
              return (
                <div className="rcp" key={id}>
                  <span className="no">{form.mode === 'SEQ' ? i + 1 : '•'}</span>
                  <Avatar id={id} name={name} />
                  <div className="who"><b>{name}</b><small>{[p?.jobTitle, p?.unitName].filter(Boolean).join(' · ')}</small></div>
                  {form.mode === 'SEQ' && (
                    <>
                      <button className="btn ico" title="Lên" aria-label="Lên" disabled={i === 0} onClick={() => move(i, -1)}><Icon name="up" size={16} /></button>
                      <button className="btn ico" title="Xuống" aria-label="Xuống" disabled={i === form.signers.length - 1} onClick={() => move(i, 1)}><Icon name="down" size={16} /></button>
                    </>
                  )}
                  <button className="btn ico dan" aria-label={`Bỏ ${name}`} onClick={() => set('signers', form.signers.filter((x) => x !== id))}><Icon name="x" size={16} /></button>
                </div>
              );
            })}
            {error && <div className="err">{error}</div>}
          </div>
          <div className="card">
            <div className="hd"><h3>Người theo dõi</h3><button className="btn sm" onClick={() => setPicker('watchers')}><Icon name="plus" size={14} />Thêm</button></div>
            <p className="mut" style={{ marginTop: 0 }}>Chỉ xem, không ký.</p>
            {form.watchers.length === 0 && <span className="mut">Chưa có</span>}
            {form.watchers.map((id) => (
              <span className="chip" key={id}>
                {person(id)?.fullName ?? `#${id}`}
                <button aria-label={`Bỏ ${person(id)?.fullName ?? id}`} onClick={() => set('watchers', form.watchers.filter((x) => x !== id))}><Icon name="x" size={14} /></button>
              </span>
            ))}
            <div className="fld" style={{ marginTop: 14 }}>
              <label htmlFor="c-msg">Lời nhắn gửi người ký</label>
              <textarea id="c-msg" rows={3} maxLength={500} value={form.message} onChange={(e) => set('message', e.target.value)} placeholder="Ví dụ: Anh chị xem giúp mục 4..." />
            </div>
          </div>
        </div>
      )}

      {step === 3 && (
        <div className="grid g12">
          <div className="card">
            <h3>Xem lại thông tin</h3>
            <table className="tbl"><tbody>
              {row('Tiêu đề', <b>{form.title}</b>)}
              {row('Loại · Ưu tiên', `${form.docType} · ${PRIORITY_LABEL[form.priority]}`)}
              {row('Hạn ký', form.deadline ? fmtDate(form.deadline) : 'Không đặt hạn')}
              {row('File cần ký', files.filter((f) => f.signable).map((f) => f.name).join(', ') || '—')}
              {row('Cách ký', form.mode === 'SEQ' ? 'Tuần tự' : 'Song song')}
              {row('Luồng ký', names(form.signers, form.mode === 'SEQ' ? ' → ' : ', '))}
              {row('Theo dõi', names(form.watchers, ', '))}
            </tbody></table>
            {error && <div className="err">{error}</div>}
          </div>
          <div className="card">
            <h3>Xem trước sơ đồ chữ ký</h3>
            <Paper
              title={form.title} code="Dự thảo" signMode={false}
              participants={form.signers.map((id, i) => ({ userId: id, fullName: person(id)?.fullName ?? `#${id}`, jobTitle: person(id)?.jobTitle, orderNo: i + 1, status: 'WAITING' as const }))}
            />
          </div>
        </div>
      )}

      <div style={{ display: 'flex', gap: 8, justifyContent: 'space-between', marginTop: 16, flexWrap: 'wrap' }}>
        <div>{step > 1 && <button className="btn" onClick={() => { setError(''); setStep(step - 1); window.scrollTo(0, 0); }}><Icon name="back" size={16} />Quay lại</button>}</div>
        <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
          <button className="btn" disabled={busy || !form.title.trim() || form.signers.length === 0} onClick={saveDraft}>Lưu nháp</button>
          {step < 3
            ? <button className="btn pri" onClick={next}>Tiếp theo →</button>
            : <button className="btn pri" disabled={busy} onClick={() => setConfirm(true)}><Icon name="send" size={16} />Trình ký</button>}
        </div>
      </div>

      {picker && (
        <PersonPickerModal
          title={picker === 'signers' ? 'Thêm người ký' : 'Thêm người theo dõi'}
          people={candidates}
          exclude={picker === 'signers' ? form.signers : form.watchers}
          onClose={() => setPicker(null)}
          onPick={(ids) => {
            if (picker === 'signers') set('signers', [...form.signers, ...ids]);
            else set('watchers', [...form.watchers, ...ids]);
            setPicker(null);
          }}
        />
      )}
      {confirm && (
        <Modal
          title="Xác nhận trình ký"
          onClose={() => setConfirm(false)}
          footer={<>
            <button className="btn" onClick={() => setConfirm(false)}>Kiểm tra lại</button>
            <button className="btn pri" disabled={busy} onClick={submit}><Icon name="send" size={16} />Trình ký</button>
          </>}
        >
          <p>Trình ký <b>{form.title}</b> cho {form.signers.length} người ký ({form.mode === 'SEQ' ? 'tuần tự' : 'song song'})?</p>
          <p className="mut">Sau khi trình ký bạn không sửa được nội dung file.</p>
        </Modal>
      )}
    </>
  );
}
