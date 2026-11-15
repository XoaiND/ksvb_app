import { SafetyOutlined, SettingOutlined } from '@ant-design/icons';
import { App, Card, Empty, Flex, Result, Switch, Table, Tabs, Tag, Typography } from 'antd';
import { useState } from 'react';
import type { AuditEntry, Person } from '../../shared/api/types';
import { useSession } from '../../shared/auth/session';
import { errorText, fmtDateTime } from '../../shared/format';
import { ErrorNote } from '../../shared/ui/PageState';
import PageHeader from '../../shared/ui/PageHeader';
import PersonAvatar from '../../shared/ui/PersonAvatar';
import { adminApi, useAdminUsers, useAuditLogs } from './api';

type AdminTab = 'users' | 'audit' | 'certs' | 'conf';
const TABS: [AdminTab, string, string][] = [
  ['users', 'Người dùng', 'user.manage'],
  ['audit', 'Nhật ký', 'audit.view'],
  ['certs', 'Chứng thư số', 'cert.manage'],
  ['conf', 'Cấu hình', 'config.manage'],
];

function UsersTab() {
  const { me } = useSession();
  const { message } = App.useApp();
  const { data, error, refetch, isFetching } = useAdminUsers();
  if (error) return <ErrorNote error={error} onRetry={() => void refetch()} />;

  const toggle = async (id: number, active: boolean) => {
    try {
      await adminApi.setUserActive(id, active);
      message.success(active ? 'Đã kích hoạt tài khoản' : 'Đã vô hiệu hoá tài khoản');
      void refetch();
    } catch (e) {
      message.error(errorText(e));
    }
  };

  return (
    <>
      <Typography.Paragraph type="secondary">
        Quyền của từng người (role.user / role.leader / role.admin) được gán trong Keycloak, client <code>ksvb-api</code>. Người
        dùng tự xuất hiện ở đây sau lần đăng nhập đầu tiên.
      </Typography.Paragraph>
      <Table<Person>
        rowKey="id"
        loading={!data || isFetching}
        dataSource={data}
        pagination={false}
        scroll={{ x: 'max-content' }}
        columns={[
          {
            title: 'Người dùng',
            key: 'name',
            render: (_, p) => (
              <Flex gap={10} align="center">
                <PersonAvatar id={p.id} name={p.fullName} />
                <div>
                  <Typography.Text strong>{p.fullName}</Typography.Text>
                  <div>
                    <Typography.Text type="secondary" style={{ fontSize: 12 }}>
                      {p.jobTitle}
                    </Typography.Text>
                  </div>
                </div>
              </Flex>
            ),
          },
          { title: 'Đơn vị', dataIndex: 'unitName', responsive: ['md'] },
          { title: 'Email', dataIndex: 'email', responsive: ['lg'] },
          {
            title: 'Hoạt động',
            key: 'active',
            render: (_, p) => (
              <Switch
                checked={p.active}
                aria-label={`Hoạt động: ${p.fullName}`}
                disabled={p.id === me?.id}
                onChange={(v) => toggle(p.id, v)}
              />
            ),
          },
        ]}
      />
    </>
  );
}

function AuditTab() {
  const [page, setPage] = useState(0);
  const { data, error, refetch, isFetching } = useAuditLogs(page, 20);
  if (error) return <ErrorNote error={error} onRetry={() => void refetch()} />;
  return (
    <Table<AuditEntry>
      rowKey="id"
      size="small"
      loading={!data || isFetching}
      dataSource={data?.content}
      scroll={{ x: 'max-content' }}
      pagination={{
        current: page + 1,
        pageSize: 20,
        total: data?.totalElements ?? 0,
        showSizeChanger: false,
        showTotal: (t) => `${t} bản ghi`,
        onChange: (p) => setPage(p - 1),
      }}
      columns={[
        { title: 'Thời gian', dataIndex: 'at', render: fmtDateTime },
        { title: 'Người thực hiện', dataIndex: 'actor' },
        { title: 'Hành động', dataIndex: 'action' },
        { title: 'Đối tượng', dataIndex: 'target', render: (v?: string) => v ?? '—' },
        { title: 'Chi tiết', dataIndex: 'detail', render: (v?: string) => v ?? '—' },
        {
          title: 'Kết quả',
          dataIndex: 'result',
          render: (v: string) => (v === 'ERROR' ? <Tag color="error">Bị chặn</Tag> : <Tag color="success">Thành công</Tag>),
        },
      ]}
    />
  );
}

function NotReady({ what }: { what: string }) {
  return (
    <Empty
      image={<SettingOutlined style={{ fontSize: 40 }} />}
      description={`${what} chưa có trong phiên bản này (backend chưa hỗ trợ).`}
    />
  );
}

export default function AdminPage() {
  const { can } = useSession();
  const visible = TABS.filter(([, , perm]) => can(perm));

  if (visible.length === 0) {
    return (
      <Card>
        <Result icon={<SafetyOutlined />} title="Bạn không có quyền truy cập trang Quản trị." />
      </Card>
    );
  }

  const content: Record<AdminTab, React.ReactNode> = {
    users: <UsersTab />,
    audit: <AuditTab />,
    certs: <NotReady what="Quản lý chứng thư số" />,
    conf: <NotReady what="Cấu hình hệ thống" />,
  };

  return (
    <>
      <PageHeader title="Quản trị" />
      <Card>
        <Tabs destroyOnHidden items={visible.map(([k, t]) => ({ key: k, label: t, children: content[k] }))} />
      </Card>
    </>
  );
}
