import { EyeOutlined } from '@ant-design/icons';
import { Button, Card, Table, Typography, type TableColumnsType } from 'antd';
import { useNavigate } from 'react-router';
import type { SignRequestSummary } from '../../../shared/api/types';
import { fmtDate } from '../../../shared/format';
import { ErrorNote } from '../../../shared/ui/PageState';
import PageHeader from '../../../shared/ui/PageHeader';
import { DocStatusTag } from '../../../shared/ui/StatusTag';
import { useSignRequests } from '../hooks';
import SignProgress from '../components/SignProgress';

export default function WatchingPage() {
  const nav = useNavigate();
  const { data, error, refetch } = useSignRequests({ scope: 'watching', size: 50 });

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
            </Typography.Text>
          </div>
        </>
      ),
    },
    { title: 'Người tạo', key: 'creator', render: (_, d) => d.creator.fullName, responsive: ['md'] },
    { title: 'Hạn ký', dataIndex: 'deadline', render: fmtDate },
    {
      title: 'Tiến độ',
      key: 'progress',
      render: (_, d) => <SignProgress signed={d.signedCount} total={d.signerCount} status={d.status} />,
      responsive: ['sm'],
    },
    { title: 'Trạng thái', key: 'status', render: (_, d) => <DocStatusTag status={d.status} /> },
    {
      title: '',
      key: 'acts',
      align: 'right',
      render: (_, d) => <Button size="small" aria-label="Xem" icon={<EyeOutlined />} onClick={() => nav(`/documents/${d.id}`)} />,
    },
  ];

  return (
    <>
      <PageHeader title="Tôi theo dõi" />
      <Card>
        <Typography.Paragraph type="secondary">
          Các tài liệu bạn được thêm vào danh sách theo dõi (chỉ xem, không ký).
        </Typography.Paragraph>
        {error ? (
          <ErrorNote error={error} onRetry={() => void refetch()} />
        ) : (
          <Table<SignRequestSummary>
            rowKey="id"
            columns={columns}
            dataSource={data?.content}
            loading={!data}
            pagination={false}
            scroll={{ x: 'max-content' }}
            locale={{ emptyText: 'Bạn chưa theo dõi tài liệu nào' }}
          />
        )}
      </Card>
    </>
  );
}
