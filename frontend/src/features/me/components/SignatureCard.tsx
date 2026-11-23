import { DeleteOutlined, ReloadOutlined, SignatureOutlined, UploadOutlined } from '@ant-design/icons';
import { Alert, App, Button, Card, Col, Flex, Modal, Popconfirm, Row, Segmented, Spin, Typography, theme } from 'antd';
import { useRef, useState, type CSSProperties, type DragEvent } from 'react';
import { errorMessage } from '../../../shared/api/http';
import type { Signature } from '../../../shared/api/types';
import { fmtDateTime } from '../../../shared/lib/format';
import { meApi } from '../api';
import { useMySignature, useRefreshSignature } from '../hooks';

const MAX_BYTES = 5 * 1024 * 1024;
const ACCEPT = ['image/png', 'image/jpeg'];
// Nền xem thử cố định sáng/tối, không theo theme đang dùng (chữ ký sẽ nằm trên giấy PDF trắng).
const LIGHT = theme.getDesignToken({ algorithm: theme.defaultAlgorithm });
const DARK = theme.getDesignToken({ algorithm: theme.darkAlgorithm });

interface Preview {
  file: File;
  originalUrl: string;
  result?: Signature;
  error?: string;
  loading: boolean;
}

/** Nền ô caro để thấy vùng trong suốt của ảnh chữ ký. */
function checker(bg: string, cell: string): CSSProperties {
  return {
    backgroundColor: bg,
    backgroundImage: `linear-gradient(45deg, ${cell} 25%, transparent 25%), linear-gradient(-45deg, ${cell} 25%, transparent 25%), linear-gradient(45deg, transparent 75%, ${cell} 75%), linear-gradient(-45deg, transparent 75%, ${cell} 75%)`,
    backgroundSize: '16px 16px',
    backgroundPosition: '0 0, 0 8px, 8px -8px, -8px 0',
  };
}

/** Thẻ "Chữ ký của tôi": tải ảnh → máy chủ tách nền → xem trước → lưu; thay ảnh, xoá. */
export default function SignatureCard({ hasSignature, updatedAt }: { hasSignature: boolean; updatedAt?: string | null }) {
  const { token } = theme.useToken();
  const { message } = App.useApp();
  const input = useRef<HTMLInputElement>(null);
  const sig = useMySignature(hasSignature);
  const refresh = useRefreshSignature();
  const [preview, setPreview] = useState<Preview | null>(null);
  const [darkBg, setDarkBg] = useState(false);
  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [dragOver, setDragOver] = useState(false);

  const light = checker(LIGHT.colorBgContainer, LIGHT.colorFillSecondary);
  const dark = checker(DARK.colorBgContainer, DARK.colorFillSecondary);

  const pick = () => {
    if (input.current) {
      input.current.value = '';
      input.current.click();
    }
  };

  const close = () => {
    if (preview) URL.revokeObjectURL(preview.originalUrl);
    setPreview(null);
  };

  const open = async (file?: File) => {
    if (!file) return;
    if (!ACCEPT.includes(file.type)) return void message.error('Chỉ nhận ảnh PNG hoặc JPG');
    if (file.size > MAX_BYTES) return void message.error('Ảnh chữ ký tối đa 5 MB');
    if (preview) URL.revokeObjectURL(preview.originalUrl);
    const originalUrl = URL.createObjectURL(file);
    setPreview({ file, originalUrl, loading: true });
    try {
      const result = await meApi.previewSignature(file);
      setPreview((p) => (p?.file === file ? { ...p, result, loading: false } : p));
    } catch (e) {
      setPreview((p) => (p?.file === file ? { ...p, error: errorMessage(e), loading: false } : p));
    }
  };

  const save = async () => {
    if (!preview) return;
    setSaving(true);
    try {
      await meApi.saveSignature(preview.file);
      message.success('Đã lưu chữ ký');
      close();
      refresh();
    } catch (e) {
      message.error(errorMessage(e));
    } finally {
      setSaving(false);
    }
  };

  const remove = async () => {
    setDeleting(true);
    try {
      await meApi.deleteSignature();
      message.success('Đã xoá chữ ký');
      refresh();
    } catch (e) {
      message.error(errorMessage(e));
    } finally {
      setDeleting(false);
    }
  };

  const onDrop = (e: DragEvent) => {
    e.preventDefault();
    setDragOver(false);
    void open(e.dataTransfer.files[0]);
  };

  const box: CSSProperties = {
    border: `1px dashed ${dragOver ? token.colorPrimary : token.colorBorder}`,
    borderRadius: token.borderRadiusLG,
    minHeight: 140,
    display: 'grid',
    placeItems: 'center',
    padding: 16,
    marginBottom: 12,
    textAlign: 'center',
  };
  const pane: CSSProperties = {
    border: `1px solid ${token.colorBorderSecondary}`,
    borderRadius: token.borderRadius,
    height: 240,
    display: 'grid',
    placeItems: 'center',
    padding: 8,
    overflow: 'hidden',
  };
  const img: CSSProperties = { maxWidth: '100%', maxHeight: '100%' };

  return (
    <Card
      title="Chữ ký của tôi"
      extra={
        hasSignature && updatedAt ? <Typography.Text type="secondary">Cập nhật {fmtDateTime(updatedAt)}</Typography.Text> : null
      }
    >
      {hasSignature ? (
        <>
          <div style={{ ...box, ...light }}>
            {sig.data ? (
              <img src={sig.data.imageDataUrl} alt="Chữ ký của tôi" style={{ maxWidth: '100%', maxHeight: 160 }} />
            ) : sig.isError ? (
              <Typography.Text type="danger">Không tải được ảnh chữ ký</Typography.Text>
            ) : (
              <Spin />
            )}
          </div>
          <Flex gap={8} wrap>
            <Button icon={<ReloadOutlined />} onClick={pick}>
              Thay ảnh
            </Button>
            <Popconfirm
              title="Xoá chữ ký?"
              description="Bạn sẽ không ký được văn bản cho tới khi tải ảnh mới."
              okText="Xoá"
              cancelText="Huỷ"
              okButtonProps={{ danger: true }}
              onConfirm={remove}
            >
              <Button danger icon={<DeleteOutlined />} loading={deleting}>
                Xoá
              </Button>
            </Popconfirm>
          </Flex>
        </>
      ) : (
        <>
          <div
            role="button"
            tabIndex={0}
            aria-label="Chọn ảnh chữ ký"
            style={{ ...box, cursor: 'pointer', background: dragOver ? token.colorPrimaryBg : undefined }}
            onClick={pick}
            onKeyDown={(e) => (e.key === 'Enter' || e.key === ' ') && pick()}
            onDragOver={(e) => {
              e.preventDefault();
              setDragOver(true);
            }}
            onDragLeave={() => setDragOver(false)}
            onDrop={onDrop}
          >
            <div>
              <SignatureOutlined style={{ fontSize: 32, color: token.colorTextQuaternary }} />
              <div>Chưa có chữ ký</div>
              <Typography.Text type="secondary">Bấm hoặc kéo ảnh chữ ký vào đây (PNG, JPG, tối đa 5 MB)</Typography.Text>
            </div>
          </div>
          <Button type="primary" icon={<UploadOutlined />} onClick={pick}>
            Tải ảnh chữ ký
          </Button>
        </>
      )}
      <Typography.Paragraph type="secondary" style={{ marginTop: 12, marginBottom: 0 }}>
        Ký trên giấy trắng bằng bút mực đậm, chụp thẳng, đủ sáng. Phần mềm tự xoá nền giấy và cắt sát chữ ký; ảnh này được đóng
        vào ô ký của bạn trên văn bản PDF khi bạn ký.
      </Typography.Paragraph>
      <input
        ref={input}
        type="file"
        accept={ACCEPT.join(',')}
        data-testid="signature-input"
        style={{ display: 'none' }}
        onChange={(e) => void open(e.target.files?.[0])}
      />

      <Modal
        open={!!preview}
        title="Xem trước chữ ký"
        width={820}
        onCancel={close}
        destroyOnHidden
        footer={[
          <Button key="pick" onClick={pick}>
            Chọn ảnh khác
          </Button>,
          <Button key="save" type="primary" loading={saving} disabled={!preview?.result} onClick={save}>
            Lưu chữ ký
          </Button>,
        ]}
      >
        {preview && (
          <>
            <Row gutter={[16, 16]}>
              <Col xs={24} md={12}>
                <Typography.Text strong>Ảnh gốc</Typography.Text>
                <div style={{ ...pane, marginTop: 6 }}>
                  <img src={preview.originalUrl} alt="Ảnh gốc" style={img} />
                </div>
              </Col>
              <Col xs={24} md={12}>
                <Flex justify="space-between" align="center">
                  <Typography.Text strong>Sau khi tách nền</Typography.Text>
                  <Segmented
                    size="small"
                    value={darkBg ? 'dark' : 'light'}
                    onChange={(v) => setDarkBg(v === 'dark')}
                    options={[
                      { value: 'light', label: 'Nền sáng' },
                      { value: 'dark', label: 'Nền tối' },
                    ]}
                  />
                </Flex>
                <div style={{ ...pane, ...(darkBg ? dark : light), marginTop: 6 }}>
                  {preview.loading ? (
                    <Spin />
                  ) : preview.result ? (
                    <img src={preview.result.imageDataUrl} alt="Chữ ký đã tách nền" style={img} />
                  ) : null}
                </div>
              </Col>
            </Row>
            {preview.error ? (
              <Alert type="error" showIcon title={preview.error} style={{ marginTop: 12 }} />
            ) : preview.result ? (
              <Alert
                type="info"
                showIcon
                title="Kiểm tra trên cả nền sáng và nền tối: nét phải liền, không còn vệt nền giấy."
                style={{ marginTop: 12 }}
              />
            ) : null}
          </>
        )}
      </Modal>
    </Card>
  );
}
