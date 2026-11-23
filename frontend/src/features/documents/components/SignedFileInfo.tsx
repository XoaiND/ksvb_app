import { CheckCircleFilled, CopyOutlined, DownloadOutlined } from '@ant-design/icons';
import { App, Button, Card, Descriptions, Flex, Table, Tag, Tooltip, Typography, theme } from 'antd';
import type { Attachment, SignRequestDetail } from '../../../shared/api/types';
import { fmtDateTime, fmtSize } from '../../../shared/lib/format';

interface Props {
  doc: SignRequestDetail;
  file: Attachment;
  /** Số trang (từ bố cục trang); chưa tải thì bỏ trống. */
  pages?: number;
  onDownload: (signed: boolean) => void;
}

/** Thông tin bản đã ký của một tệp khi văn bản đã đủ chữ ký: tệp, dung lượng, mã SHA-256, ai ký lúc nào. */
export default function SignedFileInfo({ doc, file, pages, onDownload }: Props) {
  const { token } = theme.useToken();
  const { message } = App.useApp();
  const signedName = file.name.replace(/(\.pdf)?$/i, ' (đã ký)$1');
  const steps = new Set(doc.participants.map((p) => p.stepNo)).size;
  const grouped = doc.mode === 'SEQ' && steps < doc.participants.length;
  const signed = doc.participants.filter((p) => p.status === 'SIGNED').length;
  const sha = file.signedSha256;

  const copy = async () => {
    try {
      await navigator.clipboard.writeText(sha ?? '');
      message.success('Đã sao chép mã SHA-256');
    } catch {
      message.error('Không sao chép được, hãy chọn và sao chép tay');
    }
  };

  return (
    <Card
      title={
        <Flex align="center" gap={8}>
          <CheckCircleFilled style={{ color: token.colorSuccess }} />
          Thông tin bản đã ký
        </Flex>
      }
      extra={
        <Flex gap={6} wrap>
          <Button size="small" type="primary" icon={<DownloadOutlined />} onClick={() => onDownload(true)}>
            Tải bản đã ký
          </Button>
          <Button size="small" icon={<DownloadOutlined />} onClick={() => onDownload(false)}>
            Bản gốc
          </Button>
        </Flex>
      }
      style={{ marginBottom: 16 }}
    >
      <Descriptions
        column={1}
        size="small"
        items={[
          { key: 'name', label: 'Tên tệp', children: signedName },
          {
            key: 'size',
            label: 'Dung lượng',
            children: (
              <>
                {file.signedSizeBytes != null ? fmtSize(file.signedSizeBytes) : '—'}{' '}
                <Typography.Text type="secondary">(bản gốc {fmtSize(file.sizeBytes)})</Typography.Text>
              </>
            ),
          },
          ...(pages ? [{ key: 'pages', label: 'Số trang', children: pages }] : []),
          {
            key: 'count',
            label: 'Số chữ ký',
            children: `${signed}/${doc.participants.length}${grouped ? ` · ${steps} bước` : ''}`,
          },
          { key: 'done', label: 'Ký xong lúc', children: fmtDateTime(doc.completedAt ?? file.signedAt) },
          {
            key: 'by',
            label: 'Người trình',
            children: `${doc.creator.fullName}${doc.submittedAt ? ` · ${fmtDateTime(doc.submittedAt)}` : ''}`,
          },
          {
            key: 'sha',
            label: 'Mã kiểm tra',
            children: sha ? (
              <Flex vertical gap={2}>
                <Flex align="center" gap={6}>
                  <Tooltip title={sha}>
                    <Typography.Text code>
                      SHA-256 {sha.slice(0, 8)}…{sha.slice(-8)}
                    </Typography.Text>
                  </Tooltip>
                  <Button size="small" icon={<CopyOutlined />} aria-label="Sao chép mã SHA-256" onClick={() => void copy()} />
                </Flex>
                <Typography.Text type="secondary" style={{ fontSize: 12 }}>
                  Dùng để đối chiếu tệp tải về có bị sửa hay không.
                </Typography.Text>
              </Flex>
            ) : (
              '—'
            ),
          },
        ]}
      />
      <Typography.Title level={5} style={{ marginTop: 16 }}>
        Chữ ký trong tệp
      </Typography.Title>
      <Table
        size="small"
        pagination={false}
        rowKey="userId"
        dataSource={doc.participants}
        columns={[
          { title: 'Ô', dataIndex: 'orderNo', width: 44 },
          { title: 'Người ký', dataIndex: 'fullName' },
          ...(grouped ? [{ title: 'Bước', dataIndex: 'stepNo', width: 56 }] : []),
          {
            title: 'Thời gian ký',
            dataIndex: 'signedAt',
            render: (v: string | null | undefined, p) =>
              p.status === 'SIGNED' ? fmtDateTime(v) : <Tag>{p.status === 'REJECTED' ? 'Từ chối' : 'Chưa ký'}</Tag>,
          },
        ]}
      />
    </Card>
  );
}
