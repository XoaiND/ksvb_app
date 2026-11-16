import { errorMessage, isNetworkError } from '../../../shared/api/http';
import {
  ArrowDownOutlined,
  ArrowLeftOutlined,
  ArrowUpOutlined,
  CloseOutlined,
  FileOutlined,
  InboxOutlined,
  PlusOutlined,
  SendOutlined,
} from '@ant-design/icons';
import {
  Alert,
  App,
  Button,
  Card,
  Col,
  DatePicker,
  Descriptions,
  Empty,
  Flex,
  Form,
  Input,
  Modal,
  Row,
  Segmented,
  Select,
  Steps,
  Tag,
  Typography,
  theme,
} from 'antd';
import dayjs from 'dayjs';
import { useMemo, useRef, useState, type ChangeEvent, type DragEvent } from 'react';
import { Navigate, useLocation, useNavigate, useSearchParams } from 'react-router';
import { ApiError } from '../../../shared/api/http';
import type { Person, Priority, SaveSignRequestInput, SignMode, Template } from '../../../shared/api/types';
import { useSession } from '../../../shared/auth/session';
import { fmtDate, fmtSize } from '../../../shared/lib/format';
import { DOC_TYPES, PRIORITY_LABEL } from '../../documents/lib/constants';
import { ErrorNote, Loading } from '../../../shared/ui/PageState';
import PageHeader from '../../../shared/ui/PageHeader';
import { ItemList, ItemRow } from '../../documents/components/ItemList';
import PersonAvatar from '../../../shared/ui/PersonAvatar';
import PersonPicker from '../../documents/components/PersonPicker';
import { documentsApi } from '../../documents/api';
import { useRefreshDocuments, useSignRequest, useUsers } from '../../documents/hooks';
import Paper from '../../documents/components/Paper';
import { templatesApi } from '../../templates/api';
import { useTemplates } from '../../templates/hooks';

const STEPS = ['Thông tin & file', 'Người nhận', 'Xem lại & trình ký'];

interface FileRow {
  key: string;
  name: string;
  size: string;
  signable: boolean;
  attachmentId?: number; // đã có trên máy chủ
  file?: File; // mới chọn, chưa tải lên
}

interface FormState {
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

const EMPTY: FormState = {
  title: '',
  docType: DOC_TYPES[0],
  deadline: '',
  priority: 'NORMAL',
  description: '',
  mode: 'SEQ',
  signers: [],
  watchers: [],
  message: '',
  shared: false,
};

const ext = (name: string) => name.slice(name.lastIndexOf('.') + 1).toLowerCase();
const REF_EXT = ['pdf', 'doc', 'docx', 'xls', 'xlsx', 'png', 'zip', 'rar'];

function FileItem({ f, onRemove }: { f: FileRow; onRemove: () => void }) {
  return (
    <ItemRow
      avatar={<FileOutlined />}
      title={f.name}
      description={f.size}
      extra={f.file ? <Tag color="warning">Chờ tải lên</Tag> : <Tag color="success">Đã tải lên</Tag>}
      actions={[
        <Button key="rm" type="text" size="small" aria-label={`Bỏ ${f.name}`} icon={<CloseOutlined />} onClick={onRemove} />,
      ]}
    />
  );
}

/** Tải dữ liệu (bản nháp cần sửa, người dùng, mẫu) bằng TanStack Query rồi dựng form với dữ liệu khởi tạo. */
export default function ComposePage() {
  const loc = useLocation();
  const [params] = useSearchParams();
  const editId = params.get('id') ? Number(params.get('id')) : undefined;
  const templateId = (loc.state as { templateId?: number } | null)?.templateId;

  const usersQ = useUsers();
  const templatesQ = useTemplates();
  const draftQ = useSignRequest(editId ?? 0, !!editId);

  const loadErr = usersQ.error ?? templatesQ.error ?? draftQ.error;
  if (loadErr) return <ErrorNote error={loadErr} />;
  if (usersQ.isPending || templatesQ.isPending || (editId && draftQ.isPending)) return <Loading />;
  if (draftQ.data && !draftQ.data.canEdit) return <Navigate to={`/documents/${editId}`} replace />;

  const draft = draftQ.data;
  const template = templateId ? templatesQ.data?.find((x) => x.id === templateId) : undefined;
  let initial = EMPTY;
  let initialFiles: FileRow[] = [];
  if (draft) {
    initial = {
      title: draft.title,
      docType: draft.docType,
      deadline: draft.deadline ?? '',
      priority: draft.priority,
      description: draft.description ?? '',
      mode: draft.mode,
      signers: draft.participants.map((p) => p.userId),
      watchers: draft.watchers.map((w) => w.id),
      message: draft.message ?? '',
      shared: draft.shared,
    };
    initialFiles = draft.attachments.map((a) => ({
      key: `a${a.id}`,
      name: a.name,
      size: fmtSize(a.sizeBytes),
      signable: a.signable,
      attachmentId: a.id,
    }));
  } else if (template) {
    initial = { ...EMPTY, signers: template.signers.map((s) => s.id), mode: template.mode };
  }
  return (
    <ComposeForm
      key={editId ?? 'new'}
      editId={editId}
      initial={initial}
      initialFiles={initialFiles}
      initialVersion={draft?.versionNo}
      initialStep={!draft && template ? 2 : 1}
      templateToUse={!draft ? template?.id : undefined}
      people={usersQ.data ?? []}
      templates={templatesQ.data ?? []}
    />
  );
}

interface FormProps {
  editId?: number;
  initial: FormState;
  initialFiles: FileRow[];
  initialVersion?: number;
  initialStep: number;
  /** Mẫu người nhận được chọn từ màn "Người nhận mẫu": ghi nhận đã dùng khi lưu lần đầu. */
  templateToUse?: number;
  people: Person[];
  templates: Template[];
}

function ComposeForm({
  editId,
  initial,
  initialFiles,
  initialVersion,
  initialStep,
  templateToUse,
  people,
  templates,
}: FormProps) {
  const { me } = useSession();
  const { message } = App.useApp();
  const refresh = useRefreshDocuments();
  const { token } = theme.useToken();
  const nav = useNavigate();

  const [form, setForm] = useState<FormState>(initial);
  const [files, setFiles] = useState<FileRow[]>(initialFiles);
  const [removed, setRemoved] = useState<number[]>([]);
  const [step, setStep] = useState(initialStep);
  const [error, setError] = useState('');
  const [confirm, setConfirm] = useState(false);
  const [busy, setBusy] = useState(false);
  const [picker, setPicker] = useState<'signers' | 'watchers' | null>(null);
  const savedId = useRef<number | undefined>(editId);
  const savedVersion = useRef<number | undefined>(initialVersion); // versionNo của bản đang sửa (khoá lạc quan)
  const pendingTemplate = useRef<number | undefined>(templateToUse);
  const uploaded = useRef(new Set<string>());
  const fileIn = useRef<HTMLInputElement>(null);
  const refIn = useRef<HTMLInputElement>(null);

  const set = <K extends keyof FormState>(k: K, v: FormState[K]) => setForm((f) => ({ ...f, [k]: v }));
  const person = (id: number) => people.find((p) => p.id === id);
  const candidates = useMemo(() => people.filter((p) => p.id !== me?.id), [people, me]);

  const addFiles = (list: FileList | File[], signable: boolean) => {
    const rows: FileRow[] = [];
    for (const f of Array.from(list)) {
      const e = ext(f.name);
      if (signable && e !== 'pdf') return void message.error('Tệp cần ký phải là PDF');
      if (!signable && !REF_EXT.includes(e)) return void message.error('Định dạng tệp tham khảo không được hỗ trợ');
      if (f.size > 20 * 1024 * 1024) return void message.error('Tệp vượt quá 20 MB');
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
    templatesApi.use(t.id).catch(() => undefined);
    message.success(`Đã áp dụng mẫu "${t.name}"`);
  };

  const signableCount = files.filter((f) => f.signable).length;

  const goto = (s: number) => {
    setStep(s);
    window.scrollTo(0, 0);
  };
  const next = () => {
    if (step === 1 && (!form.title.trim() || signableCount === 0))
      return void message.error('Cần nhập tiêu đề và chọn ít nhất 1 tệp PDF cần ký');
    if (step === 2 && form.signers.length === 0) return setError('Cần ít nhất một người ký.');
    setError('');
    goto(step + 1);
  };

  /** Lưu nháp lên máy chủ (tạo mới hoặc cập nhật), xoá tệp đã bỏ, tải tệp mới. Trả về id văn bản. */
  const persist = async (): Promise<number> => {
    const body: SaveSignRequestInput = {
      title: form.title.trim(),
      docType: form.docType,
      description: form.description || undefined,
      priority: form.priority,
      mode: form.mode,
      deadline: form.deadline || undefined,
      message: form.message || undefined,
      shared: form.shared,
      signerIds: form.signers,
      watcherIds: form.watchers,
    };
    const saved = savedId.current
      ? await documentsApi.update(savedId.current, { ...body, versionNo: savedVersion.current })
      : await documentsApi.create(body);
    savedVersion.current = saved.versionNo;
    savedId.current = saved.id;
    if (pendingTemplate.current) {
      templatesApi.use(pendingTemplate.current).catch(() => undefined);
      pendingTemplate.current = undefined;
    } // lần lưu sau (khi lỗi giữa chừng) không tạo trùng bản nháp
    for (const aid of removed) await documentsApi.removeAttachment(saved.id, aid);
    setRemoved([]);
    for (const f of files.filter((x) => x.file && !uploaded.current.has(x.key))) {
      const a = await documentsApi.uploadAttachment(saved.id, f.file!, f.signable);
      uploaded.current.add(f.key); // không tải lại nếu bước sau lỗi rồi bấm lưu lần nữa
      setFiles((cur) => cur.map((x) => (x.key === f.key ? { ...x, file: undefined, attachmentId: a.id } : x)));
    }
    return saved.id;
  };

  const fail = (e: unknown) => {
    setConfirm(false);
    if (e instanceof ApiError && e.errors.length > 0) {
      setError(e.errors.map((x) => x.message).join('; '));
      message.error('Dữ liệu chưa hợp lệ');
    } else {
      message.error(isNetworkError(e) ? 'Không kết nối được máy chủ, hãy thử lại.' : errorMessage(e));
    }
  };

  const saveDraft = async () => {
    setBusy(true);
    try {
      const id = await persist();
      message.success('Đã lưu bản nháp');
      refresh();
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
      await documentsApi.submit(id);
      message.success('Đã trình ký, người ký đầu tiên sẽ nhận thông báo');
      refresh();
      nav(`/documents/${id}`);
    } catch (e) {
      fail(e);
    } finally {
      setBusy(false);
    }
  };

  const names = (ids: number[], sep: string) => ids.map((id) => person(id)?.fullName ?? `#${id}`).join(sep) || '—';
  const errorBox = error && <Alert type="error" showIcon title={error} style={{ marginTop: 12 }} />;

  return (
    <>
      <PageHeader title={editId ? 'Sửa bản nháp' : 'Soạn tài liệu mới'} />
      <Steps current={step - 1} items={STEPS.map((s) => ({ title: s }))} style={{ marginBottom: 20 }} responsive />

      {step === 1 && (
        <Row gutter={[16, 16]}>
          <Col xs={24} xl={16}>
            <Card>
              <Form layout="vertical">
                <Form.Item label="Tiêu đề" htmlFor="c-title" required>
                  <Input
                    id="c-title"
                    maxLength={250}
                    value={form.title}
                    onChange={(e) => set('title', e.target.value)}
                    placeholder="Nhập tiêu đề tài liệu"
                  />
                </Form.Item>
                <Row gutter={12}>
                  <Col xs={24} md={8}>
                    <Form.Item label="Loại văn bản" htmlFor="c-type">
                      <Select
                        id="c-type"
                        value={form.docType}
                        onChange={(v) => set('docType', v)}
                        options={DOC_TYPES.map((t) => ({ value: t, label: t }))}
                      />
                    </Form.Item>
                  </Col>
                  <Col xs={24} md={8}>
                    <Form.Item label="Hạn ký" htmlFor="c-deadline">
                      <DatePicker
                        id="c-deadline"
                        style={{ width: '100%' }}
                        format="DD/MM/YYYY"
                        value={form.deadline ? dayjs(form.deadline) : null}
                        onChange={(d) => set('deadline', d ? d.format('YYYY-MM-DD') : '')}
                      />
                    </Form.Item>
                  </Col>
                  <Col xs={24} md={8}>
                    <Form.Item label="Mức ưu tiên" htmlFor="c-prio">
                      <Select
                        id="c-prio"
                        value={form.priority}
                        onChange={(v) => set('priority', v)}
                        options={(Object.keys(PRIORITY_LABEL) as Priority[]).map((p) => ({ value: p, label: PRIORITY_LABEL[p] }))}
                      />
                    </Form.Item>
                  </Col>
                </Row>
                <Form.Item label="Mô tả / ghi chú" htmlFor="c-desc">
                  <Input.TextArea
                    id="c-desc"
                    rows={3}
                    maxLength={500}
                    value={form.description}
                    onChange={(e) => set('description', e.target.value)}
                    placeholder="Nội dung tóm tắt"
                  />
                </Form.Item>
                <Form.Item label="File cần ký" required>
                  <div
                    role="button"
                    tabIndex={0}
                    aria-label="Chọn file PDF cần ký"
                    onClick={() => fileIn.current?.click()}
                    onKeyDown={(e) => e.key === 'Enter' && fileIn.current?.click()}
                    onDragOver={(e) => e.preventDefault()}
                    onDrop={onDrop}
                    style={{
                      border: `1px dashed ${token.colorBorder}`,
                      borderRadius: token.borderRadiusLG,
                      background: token.colorFillAlter,
                      padding: 20,
                      textAlign: 'center',
                      cursor: 'pointer',
                    }}
                  >
                    <InboxOutlined style={{ fontSize: 32, color: token.colorPrimary }} />
                    <p style={{ margin: '6px 0 2px' }}>
                      <b>Kéo thả file vào đây</b> hoặc bấm để chọn
                    </p>
                    <Typography.Text type="secondary">Hỗ trợ PDF, tối đa 20 MB</Typography.Text>
                  </div>
                  <input
                    ref={fileIn}
                    type="file"
                    accept=".pdf"
                    multiple
                    style={{ display: 'none' }}
                    onChange={onPick(true)}
                    data-testid="file-input"
                  />
                  <ItemList
                    items={files.filter((f) => f.signable)}
                    rowKey={(f) => f.key}
                    render={(f) => <FileItem f={f} onRemove={() => removeFile(f)} />}
                  />
                </Form.Item>
                <Form.Item label="File tham khảo (không ký)">
                  <ItemList
                    items={files.filter((f) => !f.signable)}
                    rowKey={(f) => f.key}
                    render={(f) => <FileItem f={f} onRemove={() => removeFile(f)} />}
                  />
                  <input
                    ref={refIn}
                    type="file"
                    multiple
                    style={{ display: 'none' }}
                    onChange={onPick(false)}
                    data-testid="ref-input"
                  />
                  <Button size="small" icon={<PlusOutlined />} onClick={() => refIn.current?.click()}>
                    Thêm file tham khảo
                  </Button>
                </Form.Item>
              </Form>
              {errorBox}
            </Card>
          </Col>
          <Col xs={24} xl={8}>
            <Card title="Gợi ý">
              <Typography.Paragraph type="secondary">
                Chỉ file PDF được ký. Sau khi trình ký, nội dung file không thể sửa; nếu cần sửa hãy thu hồi về nháp.
              </Typography.Paragraph>
              <Paper title={form.title || 'Tiêu đề'} code="Dự thảo" participants={[]} signMode={false} />
            </Card>
          </Col>
        </Row>
      )}

      {step === 2 && (
        <Row gutter={[16, 16]}>
          <Col xs={24} xl={16}>
            <Card
              title="Người ký"
              extra={
                <Flex gap={8} wrap>
                  <Select
                    aria-label="Dùng danh sách mẫu"
                    placeholder="Dùng danh sách mẫu…"
                    style={{ minWidth: 200 }}
                    value={null}
                    onChange={(v) => v && applyTemplate(v)}
                    options={templates.map((t) => ({ value: t.id, label: t.name }))}
                  />
                  <Button type="primary" icon={<PlusOutlined />} onClick={() => setPicker('signers')}>
                    Thêm người ký
                  </Button>
                </Flex>
              }
            >
              <Form layout="vertical">
                <Form.Item
                  label="Cách ký"
                  extra={
                    form.mode === 'SEQ'
                      ? 'Người ký lần lượt theo thứ tự bên dưới, người sau chỉ ký khi người trước đã ký.'
                      : 'Tất cả người ký nhận được yêu cầu cùng lúc.'
                  }
                >
                  <Segmented<SignMode>
                    value={form.mode}
                    onChange={(v) => set('mode', v)}
                    options={[
                      { value: 'SEQ', label: 'Tuần tự' },
                      { value: 'PAR', label: 'Song song' },
                    ]}
                  />
                </Form.Item>
              </Form>
              {form.signers.length === 0 ? (
                <Empty image={Empty.PRESENTED_IMAGE_SIMPLE} description={'Chưa có người ký. Bấm "Thêm người ký".'} />
              ) : (
                <ItemList
                  items={form.signers}
                  rowKey={(id) => id}
                  render={(id, i) => {
                    const p = person(id);
                    const name = p?.fullName ?? `#${id}`;
                    return (
                      <ItemRow
                        avatar={
                          <Flex align="center" gap={8}>
                            <Typography.Text strong style={{ width: 16 }}>
                              {form.mode === 'SEQ' ? i + 1 : '•'}
                            </Typography.Text>
                            <PersonAvatar id={id} name={name} />
                          </Flex>
                        }
                        title={name}
                        description={[p?.jobTitle, p?.unitName].filter(Boolean).join(' · ')}
                        actions={[
                          ...(form.mode === 'SEQ'
                            ? [
                                <Button
                                  key="up"
                                  size="small"
                                  aria-label="Lên"
                                  icon={<ArrowUpOutlined />}
                                  disabled={i === 0}
                                  onClick={() => move(i, -1)}
                                />,
                                <Button
                                  key="down"
                                  size="small"
                                  aria-label="Xuống"
                                  icon={<ArrowDownOutlined />}
                                  disabled={i === form.signers.length - 1}
                                  onClick={() => move(i, 1)}
                                />,
                              ]
                            : []),
                          <Button
                            key="rm"
                            size="small"
                            danger
                            aria-label={`Bỏ ${name}`}
                            icon={<CloseOutlined />}
                            onClick={() =>
                              set(
                                'signers',
                                form.signers.filter((x) => x !== id),
                              )
                            }
                          />,
                        ]}
                      />
                    );
                  }}
                />
              )}
              {errorBox}
            </Card>
          </Col>
          <Col xs={24} xl={8}>
            <Card
              title="Người theo dõi"
              extra={
                <Button size="small" icon={<PlusOutlined />} onClick={() => setPicker('watchers')}>
                  Thêm
                </Button>
              }
            >
              <Typography.Paragraph type="secondary">Chỉ xem, không ký.</Typography.Paragraph>
              {form.watchers.length === 0 && <Typography.Text type="secondary">Chưa có</Typography.Text>}
              <Flex gap={6} wrap>
                {form.watchers.map((id) => (
                  <Tag
                    key={id}
                    closable
                    closeIcon={<CloseOutlined aria-label={`Bỏ ${person(id)?.fullName ?? id}`} />}
                    onClose={() =>
                      set(
                        'watchers',
                        form.watchers.filter((x) => x !== id),
                      )
                    }
                  >
                    {person(id)?.fullName ?? `#${id}`}
                  </Tag>
                ))}
              </Flex>
              <Form layout="vertical" style={{ marginTop: 14 }}>
                <Form.Item label="Lời nhắn gửi người ký" htmlFor="c-msg">
                  <Input.TextArea
                    id="c-msg"
                    rows={3}
                    maxLength={500}
                    value={form.message}
                    onChange={(e) => set('message', e.target.value)}
                    placeholder="Ví dụ: Anh chị xem giúp mục 4..."
                  />
                </Form.Item>
              </Form>
            </Card>
          </Col>
        </Row>
      )}

      {step === 3 && (
        <Row gutter={[16, 16]}>
          <Col xs={24} xl={12}>
            <Card title="Xem lại thông tin">
              <Descriptions
                column={1}
                size="small"
                bordered
                items={[
                  { key: 't', label: 'Tiêu đề', children: <b>{form.title}</b> },
                  { key: 'p', label: 'Loại · Ưu tiên', children: `${form.docType} · ${PRIORITY_LABEL[form.priority]}` },
                  { key: 'd', label: 'Hạn ký', children: form.deadline ? fmtDate(form.deadline) : 'Không đặt hạn' },
                  {
                    key: 'f',
                    label: 'File cần ký',
                    children:
                      files
                        .filter((f) => f.signable)
                        .map((f) => f.name)
                        .join(', ') || '—',
                  },
                  { key: 'm', label: 'Cách ký', children: form.mode === 'SEQ' ? 'Tuần tự' : 'Song song' },
                  { key: 's', label: 'Luồng ký', children: names(form.signers, form.mode === 'SEQ' ? ' → ' : ', ') },
                  { key: 'w', label: 'Theo dõi', children: names(form.watchers, ', ') },
                ]}
              />
              {errorBox}
            </Card>
          </Col>
          <Col xs={24} xl={12}>
            <Card title="Xem trước sơ đồ chữ ký">
              <Paper
                title={form.title}
                code="Dự thảo"
                signMode={false}
                participants={form.signers.map((id) => ({
                  userId: id,
                  fullName: person(id)?.fullName ?? `#${id}`,
                  jobTitle: person(id)?.jobTitle,
                  status: 'WAITING' as const,
                }))}
              />
            </Card>
          </Col>
        </Row>
      )}

      <Flex justify="space-between" wrap gap={8} style={{ marginTop: 16 }}>
        <div>
          {step > 1 && (
            <Button
              icon={<ArrowLeftOutlined />}
              onClick={() => {
                setError('');
                goto(step - 1);
              }}
            >
              Quay lại
            </Button>
          )}
        </div>
        <Flex gap={8} wrap>
          <Button disabled={busy || !form.title.trim() || form.signers.length === 0} onClick={saveDraft}>
            Lưu nháp
          </Button>
          {step < 3 ? (
            <Button type="primary" onClick={next}>
              Tiếp theo →
            </Button>
          ) : (
            <Button type="primary" icon={<SendOutlined />} disabled={busy} onClick={() => setConfirm(true)}>
              Trình ký
            </Button>
          )}
        </Flex>
      </Flex>

      {picker && (
        <PersonPicker
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
      <Modal
        open={confirm}
        title="Xác nhận trình ký"
        onCancel={() => setConfirm(false)}
        onOk={submit}
        okText="Trình ký"
        okButtonProps={{ icon: <SendOutlined />, loading: busy }}
        cancelText="Kiểm tra lại"
        destroyOnHidden
      >
        <p>
          Trình ký <b>{form.title}</b> cho {form.signers.length} người ký ({form.mode === 'SEQ' ? 'tuần tự' : 'song song'})?
        </p>
        <Typography.Text type="secondary">Sau khi trình ký bạn không sửa được nội dung file.</Typography.Text>
      </Modal>
    </>
  );
}
