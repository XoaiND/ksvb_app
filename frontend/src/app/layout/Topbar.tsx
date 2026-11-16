import {
  BellOutlined,
  LogoutOutlined,
  MenuFoldOutlined,
  MenuOutlined,
  MenuUnfoldOutlined,
  UserOutlined,
} from '@ant-design/icons';
import { Badge, Button, Dropdown, Flex, Input, Layout, Typography, theme } from 'antd';
import { useState } from 'react';
import { useNavigate } from 'react-router';
import { usePendingCount } from '../../features/documents/hooks';
import { logout } from '../../shared/auth/keycloak';
import { useSession } from '../../shared/auth/session';
import PersonAvatar from '../../shared/ui/PersonAvatar';
import { ThemeMenu } from '../../shared/ui/ThemeSwitch';

interface Props {
  narrow: boolean;
  collapsed: boolean;
  onToggle: () => void;
  onMenu: () => void;
}

export default function Topbar({ narrow, collapsed, onToggle, onMenu }: Props) {
  const { me } = useSession();
  const pending = usePendingCount();
  const nav = useNavigate();
  const [q, setQ] = useState('');
  const { token } = theme.useToken();

  const search = () => {
    const k = q.trim();
    if (k) nav(`/documents?tab=2&q=${encodeURIComponent(k)}`);
  };

  return (
    <Layout.Header
      style={{
        background: token.colorBgContainer,
        borderBottom: `1px solid ${token.colorBorderSecondary}`,
        position: 'sticky',
        top: 0,
        zIndex: 10,
        display: 'flex',
        alignItems: 'center',
        gap: 8,
      }}
    >
      {narrow ? (
        <Button type="text" aria-label="Menu" icon={<MenuOutlined />} onClick={onMenu} />
      ) : (
        <Button
          type="text"
          aria-label="Thu gọn / mở rộng menu"
          title="Thu gọn / mở rộng menu  ( phím [ )"
          icon={collapsed ? <MenuUnfoldOutlined /> : <MenuFoldOutlined />}
          onClick={onToggle}
        />
      )}
      {!narrow && (
        <Input.Search
          placeholder="Tìm tài liệu của tôi, mã hiệu..."
          aria-label="Tìm tài liệu"
          style={{ maxWidth: 300 }}
          value={q}
          onChange={(e) => setQ(e.target.value)}
          onSearch={search}
        />
      )}
      <div style={{ flex: 1 }} />
      <ThemeMenu />
      <Dropdown
        trigger={['click']}
        menu={{
          items: [
            pending > 0
              ? { key: 'pending', label: `Có ${pending} tài liệu đang chờ bạn ký`, onClick: () => nav('/documents?tab=1') }
              : { key: 'none', label: 'Không có việc cần xử lý', disabled: true },
          ],
        }}
      >
        <Button
          type="text"
          aria-label="Thông báo"
          icon={
            <Badge count={pending} size="small">
              <BellOutlined />
            </Badge>
          }
        />
      </Dropdown>
      {me && (
        <Dropdown
          trigger={['click']}
          menu={{
            items: [
              { key: 'who', disabled: true, label: <Typography.Text type="secondary">{me.email}</Typography.Text> },
              { type: 'divider' },
              { key: 'profile', icon: <UserOutlined />, label: 'Thông tin cá nhân & chữ ký', onClick: () => nav('/profile') },
              { key: 'logout', icon: <LogoutOutlined />, label: 'Đăng xuất', onClick: logout },
            ],
          }}
        >
          <Flex align="center" gap={8} style={{ cursor: 'pointer' }} role="button" aria-label="Tài khoản">
            <PersonAvatar id={me.id} name={me.fullName} />
            {!narrow && <span>{me.fullName}</span>}
          </Flex>
        </Dropdown>
      )}
    </Layout.Header>
  );
}
