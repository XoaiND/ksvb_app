import { Badge, Button, Drawer, Layout, Menu, theme, type MenuProps } from 'antd';
import { useLocation, useNavigate } from 'react-router';
import { MenuFoldOutlined, MenuUnfoldOutlined } from '@ant-design/icons';

import { BRAND, useNavBadges } from '../nav';
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
  const badges = useNavBadges();
  const current = new URLSearchParams(loc.search);
  // chọn mục: khớp đúng path + query trước, sau đó path dài nhất mà mọi tham số query của mục đều có trong URL
  const selected = (() => {
    let best: { key: string; score: number } | undefined;
    for (const l of leaves) {
      const [path, qs = ''] = l.key.split('?');
      if (!loc.pathname.startsWith(path)) continue;
      const want = new URLSearchParams(qs);
      if ([...want].some(([k, v]) => current.get(k) !== v)) continue;
      const score = path.length * 1000 + [...want].length;
      if (!best || score > best.score) best = { key: l.key, score };
    }
    return best?.key ?? leaves[0]?.key ?? '';
  })();

  const label = (key: string, text: string) => {
    const n = badges[key];
    return n ? (
      <Badge count={n} size="small" offset={[10, 0]}>
        {text}
      </Badge>
    ) : (
      text
    );
  };
  const menuItems: MenuProps['items'] = navItems.map((i) => ({
    key: i.key,
    icon: i.icon,
    label: i.children ? i.label : label(i.key, i.label),
    children: i.children?.map((c) => ({ key: c.key, icon: c.icon, label: label(c.key, c.label) })),
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
