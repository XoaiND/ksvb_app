import { useSession } from '../../shared/auth/session';
import { useCallback, useEffect, useState, type ReactNode } from 'react';
import { Button, Flex, Layout, Result, theme } from 'antd';
import { StopOutlined } from '@ant-design/icons';
import { login, logout } from '../../shared/auth/keycloak';

const { Content } = Layout;

import SideMenu from './SideMenu';
import Topbar from './Topbar';
import { APP_ID } from '../nav';

const SIDEBAR_KEY = `${APP_ID}.sidebar`;

function useMedia(query: string): boolean {
  const [m, setM] = useState(() => window.matchMedia(query).matches);
  useEffect(() => {
    const mq = window.matchMedia(query);
    const on = () => setM(mq.matches);
    mq.addEventListener('change', on);
    return () => mq.removeEventListener('change', on);
  }, [query]);
  return m;
}

/** Khung trang: menu trái (thu gọn bằng phím `[`, ngăn kéo dưới 1024px), thanh trên, nội dung. */
export default function AppLayout({ children }: { children: ReactNode }) {
  const { me, meError } = useSession();
  const { token } = theme.useToken();
  const mobile = useMedia('(max-width: 1024px)');
  const narrow = useMedia('(max-width: 768px)');
  const [collapsed, setCollapsed] = useState(() => {
    try {
      return localStorage.getItem(SIDEBAR_KEY) === '1';
    } catch {
      return false;
    }
  });
  const [drawer, setDrawer] = useState(false);

  const toggle = useCallback(() => {
    if (mobile) {
      setDrawer((o) => !o);
      return;
    }
    setCollapsed((c) => {
      const next = !c;
      try {
        localStorage.setItem(SIDEBAR_KEY, next ? '1' : '0');
      } catch {
        /* bo qua */
      }
      return next;
    });
  }, [mobile]);

  // phim tat "[" thu gon / mo rong menu (khong kich hoat khi dang go chu)
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const tag = (e.target as HTMLElement | null)?.tagName ?? '';
      if (e.key === '[' && !/^(INPUT|TEXTAREA|SELECT)$/.test(tag) && !mobile) toggle();
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [mobile, toggle]);

  // /api/me lỗi (hết phiên, Keycloak lỗi, API không tới được): báo rõ thay vì để trang trống
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

  return (
    <Layout style={{ minHeight: '100vh' }}>
      <SideMenu
        collapsed={collapsed}
        mobile={mobile}
        drawerOpen={drawer}
        onCloseDrawer={() => setDrawer(false)}
        onToggle={toggle}
      />
      <Layout>
        <Topbar collapsed={collapsed} mobile={mobile} narrow={narrow} onToggle={toggle} />
        <Content style={{ padding: mobile ? 12 : 24, minWidth: 0 }}>
          {/* me chưa tải xong thì chưa biết quyền: chưa dựng route để tránh nhảy sai trang */}
          {me && children}
        </Content>
      </Layout>
    </Layout>
  );
}
