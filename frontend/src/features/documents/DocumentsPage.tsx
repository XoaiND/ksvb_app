import {
  DeleteOutlined,
  EditOutlined,
  EyeOutlined,
  FileOutlined,
  PlusOutlined,
  SearchOutlined,
  StopOutlined,
} from '@ant-design/icons';
import {
  App,
  Button,
  Card,
  Empty,
  Flex,
  Form,
  Input,
  Modal,
  Select,
  Space,
  Table,
  Tabs,
  Tooltip,
  Typography,
  type TableColumnsType,
} from 'antd';
import { useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router';
import type { DocStatus, Scope, SignRequestSummary } from '../../shared/api/types';
import { useSession } from '../../shared/auth/session';
import { DOC_STATUS, DOC_TYPES, errorText, fmtDate } from '../../shared/format';
import { ErrorNote } from '../../shared/ui/PageState';
import PageHeader from '../../shared/ui/PageHeader';
import { DocStatusTag, SignerStatusTag } from '../../shared/ui/StatusTag';
import { documentsApi, usePendingCount, useRefreshDocuments, useSignRequests, useUnits } from './api';
import SignProgress from './components/SignProgress';

type Tab = '1' | '2' | '3';
const TABS: [Tab, string, Scope][] = [
  ['1', 'Tài liệu chờ duyệt', 'pending'],
  ['2', 'Tài liệu cá nhân', 'mine'],
  ['3', 'Tài liệu chung', 'shared'],
];
interface Filter {
  q: string;
  docType: string;
  unit: string;
  status: DocStatus | '';
}
const EMPTY: Filter = { q: '', docType: '', unit: '', status: '' };
const PAGE_SIZE = 10;

export default function DocumentsPage() {
  const { me, can } = useSession();
  const { message } = App.useApp();
  const pendingCount = usePendingCount();
  const refresh = useRefreshDocuments();
  const nav = useNavigate();
  const [params, setParams] = useSearchParams();
  const tab: Tab = (['1', '2', '3'] as string[]).includes(params.get('tab') ?? '') ? (params.get('tab') as Tab) : '1';
  const scope = TABS.find((t) => t[0] === tab)![2];
  const units = useUnits();

  const [draft, setDraft] = useState<Filter>({ ...EMPTY, q: params.get('q') ?? '' });
  const [applied, setApplied] = useState<Filter>({ ...EMPTY, q: params.get('q') ?? '' });
  const [page, setPage] = useState(0);
  const [confirm, setConfirm] = useState<{ kind: 'cancel' | 'delete'; doc: SignRequestSummary } | null>(null);
  const [reason, setReason] = useState('');
  const [busy, setBusy] = useState(false);

  const { data, error, isFetching, refetch } = useSignRequests({ scope, ...applied, page, size: PAGE_SIZE });

  const apply = (f: Filter) => {
    setApplied(f);
    setPage(0);
  };
  const set = <K extends keyof Filter>(k: K, v: Filter[K]) => setDraft((f) => ({ ...f, [k]: v }));
  const closeConfirm = () => {
    setConfirm(null);
    setReason('');
  };

  const doConfirm = async () => {
    if (!confirm) return;
    if (confirm.kind === 'cancel' && !reason.trim()) return void message.error('Cần nhập lý do huỷ');
    setBusy(true);
    try {
      if (confirm.kind === 'cancel') {
        await documentsApi.cancel(confirm.doc.id, reason.trim());
        message.success('Đã huỷ tài liệu');
      } else {
        await documentsApi.remove(confirm.doc.id);
        message.success('Đã xoá bản nháp');
      }
      closeConfirm();
      refresh();
    } catch (e) {
      message.error(errorText(e));
    } finally {
      setBusy(false);
    }
  };

  const mine = (d: SignRequestSummary) => d.creator.id === me?.id;

  const columns: TableColumnsType<SignRequestSummary> = [
    {
      title: 'Tiêu đề',
      key: 'title',
      render: (_, d) => (
        <>
          <Typography.Link strong onClick={() => nav(`/documents/${d.id}`)}>
            {d.title}
          </Typography.Link>
          <div>
            <Typography.Text type="secondary" style={{ fontSize: 12 }}>
              {d.code ?? 'Chưa có số hiệu'}
              {d.priority === 'URGENT' && (
                <>
                  {' · '}
                  <Typography.Text type="danger" style={{ fontSize: 12 }}>
                    Khẩn
                  </Typography.Text>
                </>
              )}
            </Typography.Text>
          </div>
        </>
      ),
    },
    { title: 'Loại', dataIndex: 'docType', responsive: ['md'] },
    { title: 'Đơn vị', dataIndex: 'unitName', render: (v?: string) => v ?? '—', responsive: ['lg'] },
    { title: 'Người tạo', key: 'creator', render: (_, d) => d.creator.fullName, responsive: ['md'] },
    { title: 'Ngày trình', dataIndex: 'submittedAt', render: fmtDate, responsive: ['lg'] },
    { title: 'Hạn ký', dataIndex: 'deadline', render: fmtDate },
    {
      title: 'Tiến độ',
      key: 'progress',
      render: (_, d) => <SignProgress signed={d.signedCount} total={d.signerCount} status={d.status} />,
      responsive: ['sm'],
    },
    {
      title: 'Trạng thái',
      key: 'status',
      render: (_, d) => (tab === '1' ? <SignerStatusTag status="PENDING" /> : <DocStatusTag status={d.status} />),
    },
    {
      title: '',
      key: 'acts',
      align: 'right',
      render: (_, d) => (
        <Space size={4} wrap>
          {d.canSign && can('document.sign') && (
            <Button type="primary" size="small" icon={<EditOutlined />} onClick={() => nav(`/documents/${d.id}/sign`)}>
              Ký
            </Button>
          )}
          <Tooltip title="Xem">
            <Button size="small" aria-label="Xem" icon={<EyeOutlined />} onClick={() => nav(`/documents/${d.id}`)} />
          </Tooltip>
          {d.status === 'DRAFT' && mine(d) && can('document.create') && (
            <>
              <Tooltip title="Sửa">
                <Button size="small" aria-label="Sửa" icon={<EditOutlined />} onClick={() => nav(`/compose?id=${d.id}`)} />
              </Tooltip>
              <Tooltip title="Xoá">
                <Button
                  size="small"
                  danger
                  aria-label="Xoá"
                  icon={<DeleteOutlined />}
                  onClick={() => setConfirm({ kind: 'delete', doc: d })}
                />
              </Tooltip>
            </>
          )}
          {d.status === 'PENDING' && mine(d) && can('document.create') && (
            <Tooltip title="Huỷ">
              <Button
                size="small"
                danger
                aria-label="Huỷ"
                icon={<StopOutlined />}
                onClick={() => setConfirm({ kind: 'cancel', doc: d })}
              />
            </Tooltip>
          )}
        </Space>
      ),
    },
  ];

  return (
    <>
      <PageHeader title="Lưu trữ tài liệu" />
      <Card>
        <Tabs
          activeKey={tab}
          onChange={(k) => {
            setParams({ tab: k });
            setPage(0);
          }}
          items={TABS.map(([k, t]) => ({ key: k, label: `${t}${k === '1' ? ` (${pendingCount})` : ''}` }))}
        />
        <Flex gap={8} wrap style={{ marginBottom: 16 }}>
          <Input
            placeholder="Tìm tiêu đề, mã hiệu"
            aria-label="Tìm tiêu đề, mã hiệu"
            allowClear
            style={{ width: 240 }}
            value={draft.q}
            onChange={(e) => set('q', e.target.value)}
            onPressEnter={() => apply(draft)}
          />
          <Select
            aria-label="Loại văn bản"
            placeholder="Loại văn bản"
            allowClear
            style={{ width: 160 }}
            value={draft.docType || undefined}
            onChange={(v) => set('docType', v ?? '')}
            options={DOC_TYPES.map((t) => ({ value: t, label: t }))}
          />
          <Select
            aria-label="Đơn vị"
            placeholder="Đơn vị"
            allowClear
            style={{ width: 200 }}
            value={draft.unit || undefined}
            onChange={(v) => set('unit', v ?? '')}
            options={units.map((t) => ({ value: t, label: t }))}
          />
          <Select
            aria-label="Trạng thái"
            placeholder="Trạng thái"
            allowClear
            style={{ width: 150 }}
            value={draft.status || undefined}
            onChange={(v) => set('status', v ?? '')}
            options={(Object.keys(DOC_STATUS) as DocStatus[]).map((k) => ({ value: k, label: DOC_STATUS[k].label }))}
          />
          <Button type="primary" icon={<SearchOutlined />} onClick={() => apply(draft)}>
            Tìm kiếm
          </Button>
          <Button
            onClick={() => {
              setDraft({ ...EMPTY });
              apply({ ...EMPTY });
            }}
          >
            Đặt lại
          </Button>
        </Flex>
        {error ? (
          <ErrorNote error={error} onRetry={() => void refetch()} />
        ) : (
          <Table<SignRequestSummary>
            rowKey="id"
            size="middle"
            columns={columns}
            dataSource={data?.content}
            loading={!data || isFetching}
            scroll={{ x: 'max-content' }}
            locale={{
              emptyText: (
                <Empty image={<FileOutlined style={{ fontSize: 44 }} />} description="Không có tài liệu nào phù hợp">
                  {can('document.create') && (
                    <Button type="primary" icon={<PlusOutlined />} onClick={() => nav('/compose')}>
                      Soạn tài liệu mới
                    </Button>
                  )}
                </Empty>
              ),
            }}
            pagination={{
              current: page + 1,
              pageSize: PAGE_SIZE,
              total: data?.totalElements ?? 0,
              showSizeChanger: false,
              showTotal: (t) => `${t} tài liệu`,
              onChange: (p) => setPage(p - 1),
            }}
          />
        )}
      </Card>
      <Modal
        open={!!confirm}
        title={confirm?.kind === 'cancel' ? 'Huỷ tài liệu' : 'Xoá bản nháp'}
        onCancel={closeConfirm}
        onOk={doConfirm}
        okText={confirm?.kind === 'cancel' ? 'Huỷ tài liệu' : 'Xoá'}
        okButtonProps={{ danger: true, loading: busy }}
        cancelText="Không"
        destroyOnHidden
      >
        {confirm?.kind === 'cancel' ? (
          <>
            <p>
              Huỷ <b>{confirm.doc.title}</b>? Các người ký sẽ nhận thông báo và luồng ký dừng lại.
            </p>
            <Form layout="vertical">
              <Form.Item label="Lý do huỷ" htmlFor="cancel-reason" required>
                <Input.TextArea id="cancel-reason" rows={3} value={reason} onChange={(e) => setReason(e.target.value)} />
              </Form.Item>
            </Form>
          </>
        ) : (
          confirm && (
            <p>
              Xoá vĩnh viễn <b>{confirm.doc.title}</b>?
            </p>
          )
        )}
      </Modal>
    </>
  );
}
