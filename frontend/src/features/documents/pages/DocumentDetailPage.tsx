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
import {
  Alert,
  App,
  Button,
  Card,
  Checkbox,
  Col,
  Descriptions,
  Flex,
  Form,
  Input,
  Modal,
  Row,
  Spin,
  Tabs,
  Typography,
} from 'antd';
import { useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router';
import dayjs from 'dayjs';
import { useMySignature } from '../../me/hooks';
import { PAPER } from '../components/PdfPage';
import SignedPdfView from '../components/SignedPdfView';
import type { Attachment } from '../../../shared/api/types';
import { useSession } from '../../../shared/auth/session';
import { fmtDate, fmtDateTime, fmtSize } from '../../../shared/lib/format';
import { modeLabel, PRIORITY_LABEL } from '../lib/constants';
import { ErrorNote, Loading } from '../../../shared/ui/PageState';
import PageHeader from '../../../shared/ui/PageHeader';
import { ItemList, ItemRow } from '../components/ItemList';
import { DocStatusTag } from '../components/StatusTags';
import { documentsApi } from '../api';
import { useRefreshDocuments, useSignRequest, useSlotLayouts } from '../hooks';
import Paper from '../components/Paper';
import { FlowList, History } from '../components/SignFlow';
import SignedFileInfo from '../components/SignedFileInfo';

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
  const [showCaption, setShowCaption] = useState(true);
  const signableFiles = d?.attachments.filter((a) => a.signable) ?? [];
  const layoutsQ = useSlotLayouts(
    docId,
    signableFiles.map((a) => a.id),
  );
  const mySig = useMySignature(!!me?.hasSignature && signMode);

  if (error) return <ErrorNote error={error} onRetry={() => void refetch()} />;
  if (!d || !me) return <Loading />;

  const sgn = d.canSign && can('document.sign');
  const inSign = signMode && sgn;
  const myOrder = d.participants.find((p) => p.userId === me.id)?.orderNo;
  const layouts = layoutsQ.map((q) => q.data);
  const myPages = [...new Set(layouts.flatMap((l) => l?.slots.filter((s) => s.orderNo === myOrder).map((s) => s.page) ?? []))];
  const mySlotCount = layouts.reduce((n, l) => n + (l?.slots.filter((s) => s.orderNo === myOrder).length ?? 0), 0);
  const caption = (time: string) => (showCaption ? [me.fullName, time] : []);
  const pdfView = signableFiles.length > 0 && !layoutsQ.some((q) => q.isError);
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
    return run(() => documentsApi.sign(d.id, note.trim() || undefined, showCaption), 'Đã ký. Chữ ký đã được đóng vào PDF.');
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

  const download = async (a: Attachment, signed = false) => {
    try {
      await documentsApi.downloadAttachment(d.id, a, signed);
    } catch (e) {
      message.error(errorMessage(e));
    }
  };

  const mine = d.creator.id === me.id;
  const actions = (
    <>
      {signMode && (
        <>
          <Button type="primary" icon={<EditOutlined />} disabled={!sgn || !me.hasSignature} onClick={() => setDialog('sign')}>
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
            {pdfView ? (
              <SignedPdfView
                requestId={d.id}
                files={signableFiles}
                layouts={layouts}
                nameOf={(n) => d.participants.find((p) => p.orderNo === n)?.fullName ?? `Người ký ${n}`}
                status={
                  signableFiles.some((f) => f.signed)
                    ? `${d.participants.filter((p) => p.status === 'SIGNED').length}/${d.participants.length} chữ ký`
                    : 'Chưa có chữ ký'
                }
                mine={
                  inSign && myOrder
                    ? { orderNo: myOrder, signatureUrl: mySig.data?.imageDataUrl, caption: caption('dd/mm/yyyy hh:mm') }
                    : undefined
                }
              />
            ) : (
              <Paper
                title={d.title}
                code={d.code ?? 'Dự thảo'}
                participants={d.participants}
                meId={me.id}
                signMode={signMode || sgn}
              />
            )}
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
                  actions={
                    a.signable && a.signed
                      ? [
                          <Button key="orig" size="small" icon={<DownloadOutlined />} onClick={() => download(a)}>
                            Bản gốc
                          </Button>,
                          <Button
                            key="signed"
                            size="small"
                            type="primary"
                            icon={<DownloadOutlined />}
                            onClick={() => download(a, true)}
                          >
                            Bản đã ký
                          </Button>,
                        ]
                      : [
                          <Button key="dl" size="small" icon={<DownloadOutlined />} onClick={() => download(a)}>
                            Tải xuống
                          </Button>,
                        ]
                  }
                />
              )}
            />
          </Card>
        </Col>
        <Col xs={24} xl={10}>
          {d.status === 'COMPLETED' &&
            signableFiles
              .filter((a) => a.signed)
              .map((a) => (
                <SignedFileInfo
                  key={a.id}
                  doc={d}
                  file={a}
                  pages={layouts[signableFiles.indexOf(a)]?.pages.length}
                  onDownload={(signed) => void download(a, signed)}
                />
              ))}
          {inSign && (
            <Card title="Chữ ký của bạn" style={{ marginBottom: 16 }}>
              {me.hasSignature ? (
                <>
                  <SignaturePreview url={mySig.data?.imageDataUrl} caption={[]} />
                  <Typography.Paragraph type="secondary" style={{ marginBottom: 8 }}>
                    {mySlotCount > 0 ? (
                      <>
                        Sẽ đóng vào <b>{mySlotCount} ô</b> ({myPages.map((p) => `trang ${p}`).join(', ')}), co vừa khít từng
                        ô.{' '}
                      </>
                    ) : (
                      'Tệp chưa có ô ký của bạn. '
                    )}
                    <Link to="/profile">Đổi ảnh</Link>
                  </Typography.Paragraph>
                  <Checkbox checked={showCaption} onChange={(e) => setShowCaption(e.target.checked)}>
                    Ghi họ tên và thời gian ký dưới chữ ký
                  </Checkbox>
                </>
              ) : (
                <Alert
                  type="warning"
                  showIcon
                  title="Bạn chưa có ảnh chữ ký nên chưa ký được."
                  description={
                    <>
                      <Link to="/profile">Tải ảnh chữ ký</Link> rồi quay lại.
                    </>
                  }
                />
              )}
            </Card>
          )}
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
                        [
                          'Cách ký',
                          modeLabel(
                            d.mode,
                            d.participants.map((p) => p.stepNo),
                          ),
                        ],
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
          Chữ ký của bạn sẽ được đóng vào <b>{mySlotCount} ô ký</b>
          {myPages.length ? ` (trang ${myPages.join(', ')})` : ''} trên <b>{d.title}</b>, như sau:
        </p>
        <SignaturePreview url={mySig.data?.imageDataUrl} caption={caption(dayjs().format('DD/MM/YYYY HH:mm'))} framed />
        <Typography.Paragraph type="secondary">Sau khi ký, bản đã ký không sửa được.</Typography.Paragraph>
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

/** Ảnh chữ ký trên nền giấy trắng (như khi đóng vào PDF); `framed` = khung ô ký kèm dòng họ tên, thời gian. */
function SignaturePreview({ url, caption, framed }: { url?: string; caption: string[]; framed?: boolean }) {
  return (
    <Flex
      justify="center"
      style={{
        background: PAPER.colorBgContainer,
        border: `1px solid ${PAPER.colorBorderSecondary}`,
        borderRadius: PAPER.borderRadius,
        padding: 12,
        marginBottom: 12,
      }}
    >
      <Flex
        vertical
        align="center"
        style={{
          width: 240,
          height: framed ? 110 : 80,
          border: framed ? `1px dashed ${PAPER.colorPrimary}` : undefined,
          borderRadius: 4,
          padding: 4,
        }}
      >
        {url ? (
          <img src={url} alt="Chữ ký của tôi" style={{ flex: 1, minHeight: 0, maxWidth: '100%', objectFit: 'contain' }} />
        ) : (
          <Flex flex={1} align="center">
            <Spin size="small" />
          </Flex>
        )}
        {caption.map((l) => (
          <div key={l} style={{ fontSize: 12, lineHeight: 1.25, color: PAPER.colorText, fontFamily: 'serif' }}>
            {l}
          </div>
        ))}
      </Flex>
    </Flex>
  );
}
