import { errorMessage } from '../../../shared/api/http';
import {
  ArrowLeftOutlined,
  BellOutlined,
  CloseOutlined,
  DeleteOutlined,
  DownloadOutlined,
  EditOutlined,
  FileOutlined,
  StopOutlined,
} from '@ant-design/icons';
import { Alert, App, Button, Card, Checkbox, Col, Descriptions, Form, Input, Modal, Row, Tabs, Typography } from 'antd';
import { useState } from 'react';
import { useNavigate, useParams } from 'react-router';
import type { Attachment } from '../../../shared/api/types';
import { useSession } from '../../../shared/auth/session';
import { fmtDate, fmtDateTime, fmtSize, PRIORITY_LABEL } from '../../../shared/format';
import { ErrorNote, Loading } from '../../../shared/ui/PageState';
import PageHeader from '../../../shared/ui/PageHeader';
import { ItemList, ItemRow } from '../../../shared/ui/ItemList';
import { DocStatusTag } from '../../../shared/ui/StatusTag';
import { documentsApi } from '../api';
import { useRefreshDocuments, useSignRequest } from '../hooks';
import Paper from '../components/Paper';
import { FlowList, History } from '../components/SignFlow';

type Dialog = 'sign' | 'reject' | 'cancel' | 'delete' | null;

export default function DocumentDetailPage({ signMode = false }: { signMode?: boolean }) {
  const { id } = useParams();
  const docId = Number(id);
  const { me, can } = useSession();
  const { message } = App.useApp();
  const refresh = useRefreshDocuments();
  const nav = useNavigate();
  const { data: d, error, refetch, isFetching } = useSignRequest(docId);
  const [dialog, setDialog] = useState<Dialog>(null);
  const [note, setNote] = useState('');
  const [agree, setAgree] = useState(false);
  const [busy, setBusy] = useState(false);

  if (error) return <ErrorNote error={error} onRetry={() => void refetch()} />;
  if (!d || !me) return <Loading />;

  const sgn = d.canSign && can('document.sign');
  const closeDialog = () => {
    setDialog(null);
    setNote('');
    setAgree(false);
  };

  /** Chạy một thao tác, báo kết quả, làm mới chi tiết, danh sách và số việc chờ ký. */
  const run = async (fn: () => Promise<unknown>, ok: string, after?: () => void) => {
    setBusy(true);
    try {
      await fn();
      message.success(ok);
      closeDialog();
      refresh();
      after?.();
    } catch (e) {
      message.error(errorMessage(e));
    } finally {
      setBusy(false);
    }
  };

  const doSign = () => {
    if (!agree) return void message.error('Cần xác nhận đã đọc văn bản');
    return run(() => documentsApi.sign(d.id, note.trim() || undefined), 'Đã ký văn bản thành công');
  };
  const doReject = () => {
    if (!note.trim()) return void message.error('Cần nhập lý do từ chối');
    return run(() => documentsApi.reject(d.id, note.trim()), 'Đã từ chối ký');
  };
  const doCancel = () => {
    if (!note.trim()) return void message.error('Cần nhập lý do huỷ');
    return run(() => documentsApi.cancel(d.id, note.trim()), 'Đã huỷ tài liệu');
  };
  const doDelete = () =>
    run(
      () => documentsApi.remove(d.id),
      'Đã xoá bản nháp',
      () => nav('/documents?tab=2'),
    );

  const download = async (a: Attachment) => {
    try {
      await documentsApi.downloadAttachment(d.id, a);
    } catch (e) {
      message.error(errorMessage(e));
    }
  };

  const mine = d.creator.id === me.id;
  const actions = (
    <>
      {signMode && (
        <>
          <Button type="primary" icon={<EditOutlined />} disabled={!sgn} onClick={() => setDialog('sign')}>
            Ký văn bản
          </Button>
          <Button danger icon={<CloseOutlined />} disabled={!sgn} onClick={() => setDialog('reject')}>
            Từ chối
          </Button>
        </>
      )}
      {!signMode && sgn && (
        <Button type="primary" icon={<EditOutlined />} onClick={() => nav(`/documents/${d.id}/sign`)}>
          Vào màn ký
        </Button>
      )}
      {mine && d.status === 'PENDING' && can('document.create') && (
        <>
          <Button
            icon={<BellOutlined />}
            onClick={() => run(() => documentsApi.remind(d.id), 'Đã gửi nhắc ký tới người đang chờ')}
          >
            Nhắc ký
          </Button>
          {d.canRecall && <Button onClick={() => run(() => documentsApi.recall(d.id), 'Đã thu hồi về bản nháp')}>Thu hồi</Button>}
          {d.canCancel && (
            <Button danger icon={<StopOutlined />} onClick={() => setDialog('cancel')}>
              Huỷ
            </Button>
          )}
        </>
      )}
      {d.canEdit && can('document.create') && (
        <>
          <Button icon={<EditOutlined />} onClick={() => nav(`/compose?id=${d.id}`)}>
            Sửa
          </Button>
          {d.canDelete && (
            <Button danger icon={<DeleteOutlined />} onClick={() => setDialog('delete')}>
              Xoá nháp
            </Button>
          )}
        </>
      )}
    </>
  );

  return (
    <>
      <PageHeader
        before={<Button aria-label="Quay lại" icon={<ArrowLeftOutlined />} onClick={() => nav('/documents')} />}
        title={
          <>
            {signMode ? 'Ký: ' : ''}
            {d.title} <DocStatusTag status={d.status} />
          </>
        }
        extra={
          <div aria-busy={isFetching || busy} style={{ display: 'contents' }}>
            {actions}
          </div>
        }
      />
      {d.message && (
        <Alert
          type="warning"
          showIcon
          style={{ marginBottom: 16 }}
          title={
            <>
              <b>Lời nhắn từ {d.creator.fullName}:</b> {d.message}
            </>
          }
        />
      )}
      <Row gutter={[16, 16]}>
        <Col xs={24} xl={14}>
          <Card title="Nội dung">
            <Paper
              title={d.title}
              code={d.code ?? 'Dự thảo'}
              participants={d.participants}
              meId={me.id}
              signMode={signMode || sgn}
            />
            <Typography.Title level={5} style={{ marginTop: 16 }}>
              Tệp đính kèm
            </Typography.Title>
            <ItemList
              items={d.attachments}
              rowKey={(a) => a.id}
              empty={<Typography.Text type="secondary">Chưa có tệp</Typography.Text>}
              render={(a) => (
                <ItemRow
                  avatar={<FileOutlined />}
                  title={a.name}
                  description={`${fmtSize(a.sizeBytes)}${a.signable ? ' · cần ký' : ' · tham khảo'}`}
                  actions={[
                    <Button key="dl" size="small" icon={<DownloadOutlined />} onClick={() => download(a)}>
                      Tải xuống
                    </Button>,
                  ]}
                />
              )}
            />
          </Card>
        </Col>
        <Col xs={24} xl={10}>
          <Card>
            <Tabs
              items={[
                { key: 'flow', label: 'Luồng ký', children: <FlowList doc={d} /> },
                { key: 'hist', label: 'Lịch sử', children: <History doc={d} /> },
                {
                  key: 'info',
                  label: 'Thông tin',
                  children: (
                    <Descriptions
                      column={1}
                      size="small"
                      items={[
                        ['Mã hiệu', d.code ?? '—'],
                        ['Loại', d.docType],
                        ['Đơn vị', d.unitName ?? '—'],
                        ['Người tạo', d.creator.fullName],
                        ['Ngày trình', fmtDateTime(d.submittedAt)],
                        ['Hạn ký', fmtDate(d.deadline)],
                        ['Ưu tiên', PRIORITY_LABEL[d.priority]],
                        ['Cách ký', d.mode === 'SEQ' ? 'Tuần tự' : 'Song song'],
                        ['Theo dõi', d.watchers.map((w) => w.fullName).join(', ') || '—'],
                      ].map(([k, v]) => ({ key: k, label: k, children: v }))}
                    />
                  ),
                },
              ]}
            />
          </Card>
        </Col>
      </Row>

      <Modal
        open={dialog === 'sign'}
        title="Ký văn bản"
        onCancel={closeDialog}
        onOk={doSign}
        okText="Xác nhận ký"
        okButtonProps={{ icon: <EditOutlined />, loading: busy }}
        cancelText="Huỷ"
        destroyOnHidden
      >
        <p>
          Bạn sắp ký <b>{d.title}</b>.
        </p>
        <Form layout="vertical">
          <Form.Item label="Ghi chú (tuỳ chọn)" htmlFor="sign-note">
            <Input.TextArea id="sign-note" rows={3} value={note} onChange={(e) => setNote(e.target.value)} />
          </Form.Item>
        </Form>
        <Checkbox checked={agree} onChange={(e) => setAgree(e.target.checked)}>
          Tôi đã đọc và đồng ý nội dung văn bản
        </Checkbox>
      </Modal>
      <Modal
        open={dialog === 'reject'}
        title="Từ chối ký"
        onCancel={closeDialog}
        onOk={doReject}
        okText="Gửi từ chối"
        okButtonProps={{ danger: true, loading: busy }}
        cancelText="Huỷ"
        destroyOnHidden
      >
        <Form layout="vertical">
          <Form.Item label="Lý do từ chối" htmlFor="reason" required>
            <Input.TextArea
              id="reason"
              rows={4}
              placeholder="Nêu rõ lý do để người soạn chỉnh sửa"
              value={note}
              onChange={(e) => setNote(e.target.value)}
            />
          </Form.Item>
        </Form>
      </Modal>
      <Modal
        open={dialog === 'cancel'}
        title="Huỷ tài liệu"
        onCancel={closeDialog}
        onOk={doCancel}
        okText="Huỷ tài liệu"
        okButtonProps={{ danger: true, loading: busy }}
        cancelText="Không"
        destroyOnHidden
      >
        <p>
          Huỷ <b>{d.title}</b>? Các người ký sẽ nhận thông báo và luồng ký dừng lại.
        </p>
        <Form layout="vertical">
          <Form.Item label="Lý do huỷ" htmlFor="cancel-reason" required>
            <Input.TextArea id="cancel-reason" rows={3} value={note} onChange={(e) => setNote(e.target.value)} />
          </Form.Item>
        </Form>
      </Modal>
      <Modal
        open={dialog === 'delete'}
        title="Xoá bản nháp"
        onCancel={closeDialog}
        onOk={doDelete}
        okText="Xoá"
        okButtonProps={{ danger: true, loading: busy }}
        cancelText="Không"
        destroyOnHidden
      >
        <p>
          Xoá vĩnh viễn <b>{d.title}</b>?
        </p>
      </Modal>
    </>
  );
}
