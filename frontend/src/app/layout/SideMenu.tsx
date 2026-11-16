import { Button, Drawer, Layout, Menu, theme, type MenuProps } from 'antd';
import { useLocation, useNavigate } from 'react-router';
import { MenuFoldOutlined, MenuUnfoldOutlined } from '@ant-design/icons';

import { BRAND } from '../nav';
import { useNav } from './useNav';

const { Sider } = Layout;

interface Props {
  collapsed: boolean;
  mobile: boolean;
  drawerOpen: boolean;
  onCloseDrawer: () => void;
  onToggle: () => void;
}

/** Menu trái theo quyền (nav.tsx): cột thu gọn được trên màn rộng, ngăn kéo dưới 1024px. */
export default function SideMenu({ collapsed, mobile, drawerOpen: drawer, onCloseDrawer, onToggle: toggle }: Props) {
  const nav = useNavigate();
  const loc = useLocation();
  const { token } = theme.useToken();
  const setDrawer = (open: boolean) => {
    if (!open) onCloseDrawer();
  };
  const { navItems, leaves } = useNav();
  const selected =
    leaves.filter((l) => loc.pathname.startsWith(l.key)).sort((a, b) => b.key.length - a.key.length)[0]?.key ??
    leaves[0]?.key ??
    '/profile';

  const menuItems: MenuProps['items'] = navItems.map((i) => ({
    key: i.key,
    icon: i.icon,
    label: i.label,
    children: i.children?.map((c) => ({ key: c.key, icon: c.icon, label: c.label })),
  }));

  const menu = (inDrawer: boolean) => (
    <Menu
      mode="inline"
      inlineCollapsed={!inDrawer && collapsed}
      selectedKeys={[selected]}
      defaultOpenKeys={navItems.filter((i) => i.children).map((i) => i.key)}
      items={menuItems}
      onClick={(e) => {
        nav(e.key);
        setDrawer(false);
      }}
      style={{ flex: 1, borderInlineEnd: 0, overflowY: 'auto' }}
    />
  );
  const brand = (showText: boolean) => (
    <div
      style={{
        height: 56,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        gap: 8,
        fontWeight: 700,
        fontSize: 18,
        color: token.colorPrimary,
      }}
    >
      <span style={{ fontSize: 22, display: 'flex' }}>{BRAND.icon}</span>
      {showText && BRAND.name}
    </div>
  );

  return (
    <>
      {!mobile && (
        <Sider
          collapsed={collapsed}
          collapsedWidth={64}
          width={220}
          theme="light"
          trigger={null}
          style={{
            borderRight: `1px solid ${token.colorBorderSecondary}`,
            position: 'sticky',
            top: 0,
            height: '100vh',
            overflow: 'auto',
          }}
        >
          <div style={{ display: 'flex', flexDirection: 'column', height: '100%' }}>
            {brand(!collapsed)}
            {menu(false)}
            <div style={{ borderTop: `1px solid ${token.colorBorderSecondary}`, padding: 8 }}>
              <Button
                type="text"
                block
                onClick={toggle}
                title={collapsed ? 'Mở rộng menu' : 'Thu gọn menu (phím [)'}
                icon={collapsed ? <MenuUnfoldOutlined /> : <MenuFoldOutlined />}
                style={{ color: token.colorTextSecondary }}
              >
                {!collapsed && 'Thu gọn menu'}
              </Button>
            </div>
          </div>
        </Sider>
      )}
      {mobile && (
        <Drawer
          placement="left"
          open={drawer}
          onClose={() => setDrawer(false)}
          size={260}
          styles={{ body: { padding: 0 } }}
          title={brand(true)}
        >
          {menu(true)}
        </Drawer>
      )}
    </>
  );
}
