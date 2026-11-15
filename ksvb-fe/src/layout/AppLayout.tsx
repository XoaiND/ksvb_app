import { useEffect, useState } from 'react';
import { Outlet, useLocation } from 'react-router-dom';
import Icon from '../components/Icon';
import { Loading } from '../components/Async';
import { login, logout } from '../auth';
import { useApp } from '../context/AppContext';
import Sidebar from './Sidebar';
import Topbar from './Topbar';

export default function AppLayout() {
  const { me, meError, collapsed, toggleSidebar } = useApp();
  const [menuOpen, setMenuOpen] = useState(false);
  const loc = useLocation();

  useEffect(() => {
    setMenuOpen(false);
    window.scrollTo(0, 0);
  }, [loc.pathname, loc.search]);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const tag = (e.target as HTMLElement | null)?.tagName ?? '';
      if (e.key === '[' && !/^(INPUT|TEXTAREA|SELECT)$/.test(tag) && window.innerWidth > 1024) toggleSidebar();
    };
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, [toggleSidebar]);

  if (meError) {
    return (
      <div className="login">
        <div className="card" role="alert">
          <div style={{ color: 'var(--bad)' }}>
            <Icon name="ban" size={40} />
          </div>
          <h2 style={{ margin: '10px 0 4px' }}>Không vào được hệ thống</h2>
          <p className="mut">{meError}</p>
          <div style={{ display: 'flex', gap: 8, justifyContent: 'center' }}>
            <button className="btn pri" onClick={login}>
              Đăng nhập lại
            </button>
            <button className="btn" onClick={logout}>
              Đăng xuất
            </button>
          </div>
        </div>
      </div>
    );
  }
  if (!me) {
    return (
      <div className="login">
        <div className="card">
          <Loading />
        </div>
      </div>
    );
  }

  return (
    <div className={'app ' + (menuOpen ? 'menu-open ' : '') + (collapsed ? 'collapsed' : '')}>
      <Sidebar menuOpen={menuOpen} closeMenu={() => setMenuOpen(false)} />
      <div className="main">
        <Topbar onMenu={() => setMenuOpen((o) => !o)} />
        <main className="content">
          <Outlet />
        </main>
      </div>
    </div>
  );
}
