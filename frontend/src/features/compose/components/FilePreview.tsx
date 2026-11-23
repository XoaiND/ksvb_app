import { ExportOutlined } from '@ant-design/icons';
import { Button, Card, Empty, Flex, Spin, Typography, theme } from 'antd';
import { useEffect, useMemo } from 'react';
import { useApiQuery } from '../../../shared/api/query';
import { documentsApi } from '../../documents/api';
import PdfPage from '../../documents/components/PdfPage';

interface Props {
  /** Tệp đang xem: tệp vừa chọn trên máy (chưa tải lên) hoặc tệp đã có trên máy chủ. */
  file?: { name: string; file?: File; attachmentId?: number };
  /** Văn bản trên máy chủ (để xem tệp đã tải lên). */
  requestId?: number;
}

/**
 * Xem nội dung tệp PDF cần ký ngay ở bước soạn: tệp chưa tải lên mở bằng trình xem PDF của trình duyệt, tệp đã có
 * trên máy chủ hiện từng trang (ảnh do máy chủ render).
 */
export default function FilePreview({ file, requestId }: Props) {
  const { token } = theme.useToken();
  const local = file?.file;
  const url = useMemo(
    () => (local && typeof URL.createObjectURL === 'function' ? URL.createObjectURL(local) : undefined),
    [local],
  );
  useEffect(() => () => void (url && URL.revokeObjectURL(url)), [url]);
  const remote = !local && file?.attachmentId && requestId ? file.attachmentId : undefined;
  const layout = useApiQuery(
    ['sign-requests', requestId, 'attachments', remote, 'slots'],
    () => documentsApi.slots(requestId!, remote!),
    { enabled: !!remote, silent: true, keepPrevious: false },
  );
  const pages = layout.data?.pages ?? [];

  return (
    <Card
      size="small"
      title={file ? file.name : 'Xem nội dung file'}
      extra={
        file && (
          <Flex gap={8} align="center">
            {remote && pages.length > 0 && <Typography.Text type="secondary">{pages.length} trang</Typography.Text>}
            {url && (
              <Button size="small" icon={<ExportOutlined />} href={url} target="_blank" rel="noreferrer">
                Mở tab mới
              </Button>
            )}
          </Flex>
        )
      }
      styles={{ body: { background: token.colorFillSecondary, padding: 12 } }}
    >
      {!file ? (
        <Empty image={Empty.PRESENTED_IMAGE_SIMPLE} description="Chọn file PDF cần ký để xem nội dung" style={{ padding: 48 }} />
      ) : local ? (
        url ? (
          <iframe
            title={`Nội dung ${file.name}`}
            src={url}
            style={{
              width: '100%',
              height: '70vh',
              border: 0,
              borderRadius: token.borderRadius,
              background: token.colorBgContainer,
            }}
          />
        ) : (
          <Typography.Text type="secondary">Trình duyệt không xem trước được tệp này.</Typography.Text>
        )
      ) : (
        <div style={{ maxHeight: '70vh', overflow: 'auto' }}>
          <Flex vertical align="center" gap={16}>
            {layout.isError ? (
              <Typography.Text type="danger">Không đọc được tệp PDF.</Typography.Text>
            ) : !layout.data ? (
              <Spin />
            ) : (
              pages.map((size, i) => (
                <PdfPage
                  key={`${remote}-${i}`}
                  requestId={requestId!}
                  attachmentId={remote!}
                  page={i + 1}
                  width={size.width}
                  height={size.height}
                />
              ))
            )}
          </Flex>
        </div>
      )}
    </Card>
  );
}
