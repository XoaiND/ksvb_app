import { useState } from 'react';
import { useApp, type ThemeMode } from '../context/AppContext';
import Icon, { type IconName } from './Icon';

export const THEMES: { key: ThemeMode; label: string; icon: IconName; short: string }[] = [
  { key: 'light', label: 'Sáng', icon: 'sun', short: 'Sáng' },
  { key: 'dark', label: 'Tối', icon: 'moon', short: 'Tối' },
  { key: 'system', label: 'Theo hệ thống', icon: 'monitor', short: 'Hệ thống' },
];

/** Thanh chọn giao diện dạng nút phân đoạn (trang đăng nhập, hồ sơ). */
export function ThemeSeg() {
  const { theme, setTheme } = useApp();
  return (
    <div className="seg">
      {THEMES.map((t) => (
        <button key={t.key} className={theme === t.key ? 'on' : ''} title={t.label} onClick={() => setTheme(t.key)}>
          <Icon name={t.icon} size={14} />
          {t.short}
        </button>
      ))}
    </div>
  );
}

/** Nút đổi giao diện ở thanh trên, mở menu thả xuống. */
export function ThemeMenu() {
  const { theme, setTheme, isDark } = useApp();
  const [open, setOpen] = useState(false);
  const cur = THEMES.find((t) => t.key === theme) ?? THEMES[2];
  return (
    <div className="rel">
      <button className="btn ico" style={{ border: 0 }} aria-label="Giao diện" title={`Giao diện: ${cur.label}`} onClick={() => setOpen((o) => !o)}>
        <Icon name={cur.icon} size={20} />
      </button>
      {open && (
        <div className="dd" style={{ minWidth: 230 }}>
          <div className="nt"><b>Giao diện</b></div>
          {THEMES.map((t) => (
            <a key={t.key} onClick={() => { setTheme(t.key); setOpen(false); }}>
              <Icon name={t.icon} size={16} />
              <span style={{ flex: 1 }}>{t.label}</span>
              {theme === t.key && <span style={{ color: 'var(--pri-t)' }}><Icon name="check" size={16} /></span>}
            </a>
          ))}
          <div className="nt" style={{ borderBottom: 0, borderTop: '1px solid var(--border)' }}>
            <small>Đang hiển thị: {isDark ? 'tối' : 'sáng'}{theme === 'system' ? ' (theo thiết bị)' : ''}</small>
          </div>
        </div>
      )}
    </div>
  );
}
