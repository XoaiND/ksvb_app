import { useEffect, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import Avatar from '../components/Avatar';
import Icon from '../components/Icon';
import { ThemeMenu } from '../components/ThemeSwitch';
import { logout } from '../auth';
import { useApp } from '../context/AppContext';

export default function Topbar({ onMenu }: { onMenu: () => void }) {
  const { me, pendingCount, toggleSidebar } = useApp();
  const nav = useNavigate();
  const [dd, setDd] = useState<'bell' | 'user' | null>(null);
  const [q, setQ] = useState('');
  const ref = useRef<HTMLElement>(null);

  useEffect(() => {
    const close = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setDd(null);
    };
    document.addEventListener('mousedown', close);
    return () => document.removeEventListener('mousedown', close);
  }, []);

  const go = (to: string) => {
    setDd(null);
    nav(to);
  };

  const search = () => {
    const k = q.trim();
    if (k) nav(`/documents?tab=2&q=${encodeURIComponent(k)}`);
  };

  return (
    <header className="top" ref={ref}>
      <button className="hamb" onClick={onMenu} aria-label="Menu">
        <Icon name="menu" size={22} />
      </button>
      <button
        className="btn ico collapse-top"
        style={{ border: 0 }}
        onClick={toggleSidebar}
        aria-label="Thu gọn / mở rộng menu"
        title="Thu gọn / mở rộng menu  ( phím [ )"
      >
        <Icon name="panel" size={20} />
      </button>
      <div className="gsearch rel" style={{ flex: '0 1 300px' }}>
        <input
          type="text"
          placeholder="Tìm tài liệu của tôi, mã hiệu..."
          aria-label="Tìm tài liệu"
          style={{ width: '100%', paddingLeft: 32 }}
          value={q}
          onChange={(e) => setQ(e.target.value)}
          onKeyDown={(e) => e.key === 'Enter' && search()}
        />
        <span style={{ position: 'absolute', left: 9, top: 8, color: 'var(--mut)' }}>
          <Icon name="search" size={16} />
        </span>
      </div>
      <div className="sp" />
      <ThemeMenu />
      <div className="rel">
        <button
          className="btn ico"
          style={{ border: 0, position: 'relative' }}
          aria-label="Thông báo"
          onClick={() => setDd(dd === 'bell' ? null : 'bell')}
        >
          <Icon name="bell" size={20} />
          {pendingCount > 0 && (
            <span className="badge-n" style={{ position: 'absolute', top: -2, right: -2, margin: 0 }}>
              {pendingCount}
            </span>
          )}
        </button>
        {dd === 'bell' && (
          <div className="dd" style={{ width: 320, maxWidth: '86vw' }}>
            <div className="nt">
              <b>Thông báo</b>
            </div>
            {pendingCount > 0 ? (
              <a onClick={() => go('/documents?tab=1')}>Có {pendingCount} tài liệu đang chờ bạn ký</a>
            ) : (
              <div className="nt">
                <small>Không có việc cần xử lý</small>
              </div>
            )}
          </div>
        )}
      </div>
      {me && (
        <div className="rel">
          <div
            onClick={() => setDd(dd === 'user' ? null : 'user')}
            style={{ display: 'flex', alignItems: 'center', gap: 8, cursor: 'pointer' }}
          >
            <Avatar id={me.id} name={me.fullName} />
            <span className="gsearch">{me.fullName}</span>
          </div>
          {dd === 'user' && (
            <div className="dd">
              <div className="nt">
                <b>{me.fullName}</b>
                <small>{me.email}</small>
              </div>
              <a onClick={() => go('/profile')}>
                <Icon name="user" size={16} />
                Thông tin cá nhân & chữ ký
              </a>
              <a
                onClick={() => {
                  setDd(null);
                  logout();
                }}
              >
                <Icon name="logout" size={16} />
                Đăng xuất
              </a>
            </div>
          )}
        </div>
      )}
    </header>
  );
}
