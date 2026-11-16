import { Card, Col, Empty, Flex, Progress, Row, Statistic, Table, Typography, theme } from 'antd';
import type { SlowSigner } from '../../../shared/api/types';
import { useSession } from '../../../shared/auth/session';
import { fmtNumber } from '../../../shared/format';
import { ErrorNote, Loading } from '../../../shared/ui/PageState';
import PageHeader from '../../../shared/ui/PageHeader';
import { useReport } from '../hooks';

export default function ReportsPage() {
  const { can } = useSession();
  const { token } = theme.useToken();
  const allowed = can('report.view');
  const { data: r, error, refetch } = useReport(allowed);

  if (!allowed) return <ErrorNote error={new Error('Bạn chưa được cấp quyền xem báo cáo (report.view).')} />;
  if (error) return <ErrorNote error={error} onRetry={() => void refetch()} />;
  if (!r) return <Loading />;

  const units = Object.entries(r.byUnit);
  const max = Math.max(...units.map(([, v]) => v), 1);

  return (
    <>
      <PageHeader title="Báo cáo" />
      <Row gutter={[16, 16]}>
        <Col xs={12} lg={6}>
          <Card>
            <Statistic title="Tổng văn bản" value={r.total} />
          </Card>
        </Col>
        <Col xs={12} lg={6}>
          <Card>
            <Statistic title="Thời gian ký trung bình" value={`${fmtNumber(r.avgSignHours / 24)} ngày`} />
          </Card>
        </Col>
        <Col xs={12} lg={6}>
          <Card>
            <Statistic
              title="Tỷ lệ hoàn thành đúng hạn"
              value={`${fmtNumber(r.onTimeRate)}%`}
              styles={{ content: { color: token.colorSuccess } }}
            />
          </Card>
        </Col>
        <Col xs={12} lg={6}>
          <Card>
            <Statistic title="Văn bản quá hạn" value={r.overdue} styles={{ content: { color: token.colorError } }} />
          </Card>
        </Col>
        <Col xs={24} lg={12}>
          <Card title="Văn bản theo đơn vị">
            {units.length === 0 && <Empty description="Chưa có dữ liệu" image={Empty.PRESENTED_IMAGE_SIMPLE} />}
            {units.map(([n, v]) => (
              <Flex key={n} align="center" gap={8}>
                <Typography.Text style={{ width: 160 }} ellipsis={{ tooltip: n }}>
                  {n}
                </Typography.Text>
                <Progress percent={(v / max) * 100} showInfo={false} style={{ flex: 1, margin: 0 }} />
                <b style={{ width: 32, textAlign: 'right' }}>{v}</b>
              </Flex>
            ))}
          </Card>
        </Col>
        <Col xs={24} lg={12}>
          <Card title="Người ký chậm nhất">
            <Table<SlowSigner>
              rowKey="fullName"
              size="small"
              pagination={false}
              dataSource={r.slowestSigners}
              locale={{ emptyText: 'Chưa có dữ liệu' }}
              columns={[
                { title: 'Người ký', dataIndex: 'fullName' },
                { title: 'Chờ ký TB', dataIndex: 'avgWaitHours', render: (h: number) => `${fmtNumber(h / 24)} ngày` },
                { title: 'Quá hạn', dataIndex: 'overdue' },
              ]}
            />
          </Card>
        </Col>
      </Row>
    </>
  );
}
