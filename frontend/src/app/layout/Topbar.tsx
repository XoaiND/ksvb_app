import { useSession } from '../../shared/auth/session';
import { Button, Dropdown, Layout, Space, Typography, theme, type MenuProps } from 'antd';
import { LogoutOutlined, MenuFoldOutlined, MenuOutlined, MenuUnfoldOutlined } from '@ant-design/icons';
import { useNavigate } from 'react-router';

import { logout } from '../../shared/auth/keycloak';
import PersonAvatar from '../../shared/ui/PersonAvatar';
import { ThemeMenu } from '../../shared/ui/ThemeSwitch';
import { TopbarEnd, TopbarStart, USER_MENU, userAvatarId, userDisplayName } from '../nav';

const { Header } = Layout;

interface Props {
  collapsed: boolean;
  mobile: boolean;
  narrow: boolean;
  onToggle: () => void;
}

/** Thanh trên: nút menu, slot riêng của app (nav.tsx), giao diện sáng/tối, menu người dùng. */
export default function Topbar({ collapsed, mobile, narrow, onToggle: toggle }: Props) {
  const nav = useNavigate();
  const { token } = theme.useToken();
  const { me } = useSession();

  const userMenu: MenuProps = {
    items: [
      ...USER_MENU.map((m) => ({ key: m.key, icon: m.icon, label: m.label, onClick: () => nav(m.path) })),
      { key: 'logout', icon: <LogoutOutlined />, label: 'Đăng xuất', onClick: logout },
    ],
  };

  return (
    <Header
      style={{
        background: token.colorBgContainer,
        padding: '0 16px',
        borderBottom: `1px solid ${token.colorBorderSecondary}`,
        display: 'flex',
        alignItems: 'center',
        gap: 8,
        height: 56,
        lineHeight: 'normal',
        position: 'sticky',
        top: 0,
        zIndex: 20,
      }}
    >
      <Button
        type="text"
        aria-label="Thu gọn / mở rộng menu"
        icon={mobile ? <MenuOutlined /> : collapsed ? <MenuUnfoldOutlined /> : <MenuFoldOutlined />}
        onClick={toggle}
      />
      <TopbarStart narrow={narrow} />
      <div style={{ flex: 1 }} />
      <TopbarEnd />
      <ThemeMenu />
      <Dropdown menu={userMenu} trigger={['click']}>
        <Space style={{ cursor: 'pointer' }}>
          <PersonAvatar id={userAvatarId(me)} name={userDisplayName(me)} />
          {!narrow && <Typography.Text>{userDisplayName(me)}</Typography.Text>}
        </Space>
      </Dropdown>
    </Header>
  );
}
