import { EditOutlined, PlusOutlined } from '@ant-design/icons';
import { Button, Card, Col, Descriptions, Empty, Flex, Row, Select, Statistic, Typography, theme } from 'antd';
import { ItemList, ItemRow } from '../../documents/components/ItemList';
import { useState } from 'react';
import { useNavigate } from 'react-router';
import { useSession } from '../../../shared/auth/session';
import { fmtDate } from '../../../shared/lib/format';
import { ErrorNote, Loading } from '../../../shared/ui/PageState';
import PageHeader from '../../../shared/ui/PageHeader';
import PersonAvatar from '../../../shared/ui/PersonAvatar';
import { useDashboard } from '../hooks';

const MONTH_LABELS = ['T1', 'T2', 'T3', 'T4', 'T5', 'T6', 'T7', 'T8', 'T9', 'T10', 'T11', 'T12'];

export default function DashboardPage() {
  const { me, can } = useSession();
  const nav = useNavigate();
  const { token } = theme.useToken();
  const [year, setYear] = useState(new Date().getFullYear());
  const { data: d, error, isFetching, refetch } = useDashboard(year);

  if (error) return <ErrorNote error={error} onRetry={() => void refetch()} />;
  if (!d || !me) return <Loading />;

  const overview = [
    { name: 'Chờ tôi duyệt', value: d.pendingForMe, color: token.colorPrimary },
    { name: 'Đang xử lý', value: d.inProgress, color: token.colorInfo },
    { name: 'Hoàn thành', value: d.completed, color: token.colorSuccess },
    { name: 'Từ chối / Huỷ', value: d.rejectedOrCancelled, color: token.colorError },
  ];
  const total = overview.reduce((a, b) => a + b.value, 0);
  const tiles = [
    { label: 'Tài liệu chờ duyệt', value: d.pendingForMe, tab: '1' },
    { label: 'Tài liệu cá nhân', value: d.mine, tab: '2' },
    { label: 'Tài liệu chung', value: d.shared, tab: '3' },
    { label: 'Khác', value: d.expired, tab: '2' },
  ];
  const mx = Math.max(...d.completedByMonth, 1);

  return (
    <>
      <PageHeader
        title="Dashboard"
        extra={
          can('document.create') && (
            <Button type="primary" icon={<PlusOutlined />} onClick={() => nav('/compose')}>
              Soạn tài liệu mới
            </Button>
          )
        }
      />
      <Row gutter={[16, 16]} aria-busy={isFetching}>
        <Col xs={24} lg={8}>
          <Card title="Tổng quan văn bản" style={{ height: '100%' }}>
            <Statistic title="Tổng" value={total} suffix="văn bản" />
            <Flex
              style={{ height: 10, borderRadius: 5, overflow: 'hidden', margin: '12px 0', background: token.colorFillSecondary }}
            >
              {total > 0 &&
                overview.map((o) => <div key={o.name} style={{ width: `${(o.value / total) * 100}%`, background: o.color }} />)}
            </Flex>
            {overview.map((o) => (
              <Flex key={o.name} justify="space-between" style={{ padding: '2px 0' }}>
                <span>
                  <span
                    style={{
                      display: 'inline-block',
                      width: 10,
                      height: 10,
                      borderRadius: 2,
                      background: o.color,
                      marginRight: 8,
                    }}
                  />
                  {o.name}
                </span>
                <b>{o.value}</b>
              </Flex>
            ))}
          </Card>
        </Col>
        <Col xs={24} lg={8}>
          <Card
            title="Tài liệu của tôi"
            extra={<Typography.Link onClick={() => nav('/documents?tab=1')}>Xem tất cả →</Typography.Link>}
            style={{ height: '100%' }}
          >
            <Row gutter={[10, 10]}>
              {tiles.map((t) => (
                <Col span={12} key={t.label}>
                  <Card size="small" hoverable onClick={() => nav(`/documents?tab=${t.tab}`)}>
                    <Statistic title={t.label} value={t.value} />
                  </Card>
                </Col>
              ))}
            </Row>
          </Card>
        </Col>
        <Col xs={24} lg={8}>
          <Card title="Thông tin cá nhân" style={{ height: '100%' }}>
            <Flex gap={12} align="center" style={{ marginBottom: 12 }}>
              <PersonAvatar id={me.id} name={me.fullName} size={48} />
              <div>
                <Typography.Text strong>{me.fullName}</Typography.Text>
                <div>
                  <Typography.Link>{me.email}</Typography.Link>
                </div>
              </div>
            </Flex>
            <Descriptions
              column={1}
              size="small"
              items={[
                { key: 'unit', label: 'Đơn vị', children: me.unitName ?? '—' },
                { key: 'job', label: 'Vị trí công việc', children: me.jobTitle ?? '—' },
                {
                  key: 'sign',
                  label: 'Quyền ký',
                  children: can('document.sign') ? (
                    <Typography.Text type="success" strong>
                      Được phép ký văn bản
                    </Typography.Text>
                  ) : (
                    <Typography.Text type="secondary" strong>
                      Chưa được cấp quyền ký
                    </Typography.Text>
                  ),
                },
              ]}
            />
          </Card>
        </Col>
        <Col xs={24} lg={14}>
          <Card
            title="Báo cáo văn bản hoàn tất theo tháng"
            extra={
              <Select
                aria-label="Năm"
                value={year}
                onChange={setYear}
                options={[year, year - 1, year - 2].map((y) => ({ value: y, label: y }))}
                style={{ width: 100 }}
              />
            }
          >
            <Flex align="flex-end" gap={6} style={{ height: 180 }}>
              {d.completedByMonth.map((v, i) => (
                <Flex key={i} vertical align="center" justify="flex-end" style={{ flex: 1, height: '100%' }}>
                  <Typography.Text type="secondary" style={{ fontSize: 12 }}>
                    {v}
                  </Typography.Text>
                  <div
                    style={{
                      width: '70%',
                      height: `${(v / mx) * 75}%`,
                      minHeight: 2,
                      background: token.colorPrimary,
                      borderRadius: '4px 4px 0 0',
                    }}
                  />
                  <Typography.Text type="secondary" style={{ fontSize: 12 }}>
                    {MONTH_LABELS[i]}
                  </Typography.Text>
                </Flex>
              ))}
            </Flex>
          </Card>
        </Col>
        <Col xs={24} lg={10}>
          <Card title="Việc cần xử lý ngay">
            {d.todo.length === 0 ? (
              <Empty description="Không có việc cần ký" image={Empty.PRESENTED_IMAGE_SIMPLE} />
            ) : (
              <ItemList
                items={d.todo}
                rowKey={(t) => t.id}
                render={(t) => (
                  <ItemRow
                    title={<Typography.Link onClick={() => nav(`/documents/${t.id}`)}>{t.title}</Typography.Link>}
                    description={`${t.code ?? ''} · từ ${t.creator.fullName} · hạn ${fmtDate(t.deadline)}`}
                    actions={[
                      <Button
                        key="sign"
                        type="primary"
                        size="small"
                        icon={<EditOutlined />}
                        onClick={() => nav(`/documents/${t.id}/sign`)}
                      >
                        Ký ngay
                      </Button>,
                    ]}
                  />
                )}
              />
            )}
          </Card>
        </Col>
      </Row>
    </>
  );
}
