import { DoubleLeftOutlined, DoubleRightOutlined, SafetyCertificateOutlined, StopOutlined } from '@ant-design/icons';
import { Button, Drawer, Flex, Layout, Result, Spin, Typography, theme } from 'antd';
import { useCallback, useEffect, useState } from 'react';
import { Outlet, useLocation } from 'react-router';
import { login, logout } from '../../shared/auth/keycloak';
import { useSession } from '../../shared/auth/session';
import SideMenu from './SideMenu';
import Topbar from './Topbar';

/** Dưới 1024px menu trái thành ngăn kéo (ECOSYSTEM.md 8). */
const NARROW = 1024;
const SIDEBAR_KEY = 'ksvb.sidebar.collapsed';

function useNarrow(): boolean {
  const [narrow, setNarrow] = useState(() => window.innerWidth < NARROW);
  useEffect(() => {
    const on = () => setNarrow(window.innerWidth < NARROW);
    window.addEventListener('resize', on);
    return () => window.removeEventListener('resize', on);
  }, []);
  return narrow;
}

function Brand({ collapsed }: { collapsed: boolean }) {
  const { token } = theme.useToken();
  return (
    <Flex align="center" gap={8} style={{ height: 56, padding: '0 20px', color: token.colorPrimary, fontWeight: 700 }}>
      <SafetyCertificateOutlined style={{ fontSize: 20 }} />
      {!collapsed && <span>Ký số văn bản</span>}
    </Flex>
  );
}

export default function AppLayout() {
  const { me, meError } = useSession();
  const [collapsed, setCollapsed] = useState(() => {
    try {
      return localStorage.getItem(SIDEBAR_KEY) === '1';
    } catch {
      return false;
    }
  });
  const toggleSidebar = useCallback(() => {
    setCollapsed((c) => {
      try {
        localStorage.setItem(SIDEBAR_KEY, c ? '0' : '1');
      } catch {
        /* bỏ qua: trình duyệt chặn lưu */
      }
      return !c;
    });
  }, []);
  const narrow = useNarrow();
  const [drawer, setDrawer] = useState(false);
  const loc = useLocation();
  const { token } = theme.useToken();

  useEffect(() => {
    setDrawer(false);
    window.scrollTo(0, 0);
  }, [loc.pathname, loc.search]);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const tag = (e.target as HTMLElement | null)?.tagName ?? '';
      if (e.key === '[' && !/^(INPUT|TEXTAREA|SELECT)$/.test(tag) && !narrow) toggleSidebar();
    };
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, [toggleSidebar, narrow]);

  if (meError) {
    return (
      <Flex justify="center" align="center" style={{ minHeight: '100vh', background: token.colorBgLayout }}>
        <div role="alert">
          <Result
            status="error"
            icon={<StopOutlined />}
            title="Không vào được hệ thống"
            subTitle={meError}
            extra={[
              <Button key="in" type="primary" onClick={login}>
                Đăng nhập lại
              </Button>,
              <Button key="out" onClick={logout}>
                Đăng xuất
              </Button>,
            ]}
          />
        </div>
      </Flex>
    );
  }
  if (!me) {
    return (
      <Flex justify="center" align="center" style={{ minHeight: '100vh', background: token.colorBgLayout }}>
        <Spin size="large" aria-label="Đang tải" />
      </Flex>
    );
  }

  return (
    <Layout style={{ minHeight: '100vh' }} className="app">
      {!narrow && (
        <Layout.Sider
          collapsed={collapsed}
          width={248}
          collapsedWidth={64}
          theme="light"
          style={{ borderInlineEnd: `1px solid ${token.colorBorderSecondary}`, position: 'sticky', top: 0, height: '100vh' }}
        >
          <Flex vertical style={{ height: '100%' }}>
            <Brand collapsed={collapsed} />
            <div style={{ flex: 1, overflowY: 'auto' }}>
              <SideMenu collapsed={collapsed} />
            </div>
            <div style={{ padding: 8, borderTop: `1px solid ${token.colorBorderSecondary}` }}>
              <Button
                type="text"
                block
                icon={collapsed ? <DoubleRightOutlined /> : <DoubleLeftOutlined />}
                onClick={toggleSidebar}
                title={collapsed ? 'Mở rộng menu' : 'Thu gọn menu'}
              >
                {!collapsed && 'Thu gọn menu'}
              </Button>
            </div>
          </Flex>
        </Layout.Sider>
      )}
      {narrow && (
        <Drawer
          open={drawer}
          placement="left"
          size={280}
          onClose={() => setDrawer(false)}
          title={<Typography.Text strong>Ký số văn bản</Typography.Text>}
          styles={{ body: { padding: 0 } }}
        >
          <SideMenu collapsed={false} onNavigate={() => setDrawer(false)} />
        </Drawer>
      )}
      <Layout>
        <Topbar narrow={narrow} collapsed={collapsed} onToggle={toggleSidebar} onMenu={() => setDrawer((o) => !o)} />
        <Layout.Content style={{ padding: narrow ? 12 : 24 }}>
          <main>
            <Outlet />
          </main>
        </Layout.Content>
      </Layout>
    </Layout>
  );
}
