import { useState, type MouseEvent } from 'react';
import { useLocation, useNavigate, useSearchParams } from 'react-router-dom';
import Icon, { type IconName } from '../components/Icon';
import { useApp } from '../context/AppContext';

interface NavItem {
  to: string;
  title: string;
  icon: IconName;
  /** Quyền cần có để thấy mục này (bất kỳ một trong các quyền). Không khai báo = ai đăng nhập cũng thấy. */
  needs?: string[];
  subs?: { tab: string; title: string; badge?: boolean }[];
}

export const ADMIN_PERMISSIONS = ['user.manage', 'audit.view', 'config.manage', 'cert.manage'];

export const NAV: NavItem[] = [
  { to: '/dashboard', title: 'Dashboard', icon: 'home' },
  { to: '/compose', title: 'Soạn tài liệu mới', icon: 'edit', needs: ['document.create'] },
  {
    to: '/documents', title: 'Lưu trữ tài liệu', icon: 'folder',
    subs: [
      { tab: '1', title: 'Chờ tôi duyệt', badge: true },
      { tab: '2', title: 'Tài liệu cá nhân' },
      { tab: '3', title: 'Tài liệu chung' },
    ],
  },
  { to: '/watching', title: 'Tôi theo dõi', icon: 'eye' },
  { to: '/templates', title: 'Người nhận mẫu', icon: 'users', needs: ['document.create'] },
  { to: '/reports', title: 'Báo cáo', icon: 'chart', needs: ['report.view'] },
  { to: '/admin', title: 'Quản trị', icon: 'sliders', needs: ADMIN_PERMISSIONS },
];

interface Props {
  menuOpen: boolean;
  closeMenu: () => void;
}

export default function Sidebar({ menuOpen, closeMenu }: Props) {
  const { can, pendingCount, collapsed, toggleSidebar } = useApp();
  const nav = useNavigate();
  const loc = useLocation();
  const [params] = useSearchParams();
  const [subOpen, setSubOpen] = useState(true);
  const [tip, setTip] = useState<{ text: string; x: number; y: number } | null>(null);

  const onDocs = loc.pathname === '/documents';
  const tab = params.get('tab') ?? '1';

  const go = (to: string) => {
    closeMenu();
    nav(to);
  };

  const showTip = (e: MouseEvent<HTMLElement>, text: string) => {
    if (!collapsed || window.innerWidth <= 1024) return setTip(null);
    const r = e.currentTarget.getBoundingClientRect();
    setTip({ text, x: r.right + 10, y: r.top + r.height / 2 - 14 });
  };

  const placeFlyout = (e: MouseEvent<HTMLElement>) => {
    const subs = e.currentTarget.querySelector<HTMLElement>('.subs');
    const head = e.currentTarget.firstElementChild as HTMLElement | null;
    if (subs && head) subs.style.top = head.getBoundingClientRect().top + 'px';
  };

  return (
    <>
      <div className={'overlay' + (menuOpen ? ' show' : '')} onClick={closeMenu} />
      <aside className="side" aria-label="Menu chính">
        <div className="brand">
          <Icon name="shield" size={20} />
          <span className="lbl">Ký số văn bản</span>
        </div>
        <nav className="nav" onMouseLeave={() => setTip(null)}>
          {NAV.filter((n) => !n.needs || n.needs.some(can)).map((n) => {
            if (!n.subs) {
              const on = loc.pathname === n.to;
              return (
                <a key={n.to} className={on ? 'on' : ''} onClick={() => go(n.to)} onMouseEnter={(e) => showTip(e, n.title)}>
                  <Icon name={n.icon} />
                  <span className="lbl">{n.title}</span>
                </a>
              );
            }
            return (
              <div className="navgrp" key={n.to} onMouseEnter={placeFlyout}>
                <a className={onDocs ? 'act' : ''} onClick={() => { setSubOpen(true); go(`${n.to}?tab=1`); }} onMouseEnter={(e) => showTip(e, n.title)}>
                  <Icon name={n.icon} />
                  <span className="lbl">{n.title}</span>
                  <button
                    className={'chev' + (subOpen ? ' open' : '')}
                    title="Mở / đóng nhóm"
                    aria-label="Mở / đóng nhóm"
                    onClick={(e) => { e.stopPropagation(); setSubOpen((s) => !s); }}
                  >
                    <Icon name="down" size={16} />
                  </button>
                  {pendingCount > 0 && <span className="dot" />}
                </a>
                <div className={'subs' + (subOpen ? '' : ' shut')}>
                  <div className="subhd">{n.title}</div>
                  {n.subs.map((s) => (
                    <a key={s.tab} className={'sub' + (onDocs && tab === s.tab ? ' on' : '')} onClick={() => go(`${n.to}?tab=${s.tab}`)}>
                      <span className="lbl">{s.title}</span>
                      {s.badge && pendingCount > 0 && <span className="badge-n">{pendingCount}</span>}
                    </a>
                  ))}
                </div>
              </div>
            );
          })}
        </nav>
        <div className="sidefoot">
          <button className="btn collapse-foot" onClick={toggleSidebar} title={collapsed ? 'Mở rộng menu' : 'Thu gọn menu'}>
            <Icon name={collapsed ? 'chevr' : 'chevl'} />
            <span className="lbl">Thu gọn menu</span>
          </button>
        </div>
      </aside>
      <div className={'tip' + (tip ? ' show' : '')} style={tip ? { left: tip.x, top: tip.y } : undefined}>
        {tip?.text}
      </div>
    </>
  );
}
