import { CheckOutlined, DesktopOutlined, MoonOutlined, SunOutlined } from '@ant-design/icons';
import { Button, Dropdown, Segmented } from 'antd';
import type { ReactNode } from 'react';
import { useTheme, type ThemeMode } from '../theme/ThemeProvider';

const THEMES: { key: ThemeMode; label: string; short: string; icon: ReactNode }[] = [
  { key: 'light', label: 'Sáng', short: 'Sáng', icon: <SunOutlined /> },
  { key: 'dark', label: 'Tối', short: 'Tối', icon: <MoonOutlined /> },
  { key: 'system', label: 'Theo hệ thống', short: 'Hệ thống', icon: <DesktopOutlined /> },
];

/** Chọn giao diện dạng nút phân đoạn (trang đăng nhập, hồ sơ). */
export function ThemeSegmented() {
  const { mode: theme, setMode: setTheme } = useTheme();
  return (
    <Segmented<ThemeMode>
      aria-label="Giao diện"
      value={theme}
      onChange={setTheme}
      options={THEMES.map((t) => ({ value: t.key, label: t.short, icon: t.icon, title: t.label }))}
    />
  );
}

/** Nút đổi giao diện ở thanh trên. */
export function ThemeMenu() {
  const { mode: theme, setMode: setTheme, isDark } = useTheme();
  const cur = THEMES.find((t) => t.key === theme) ?? THEMES[2];
  return (
    <Dropdown
      trigger={['click']}
      menu={{
        selectable: true,
        selectedKeys: [theme],
        onClick: ({ key }) => setTheme(key as ThemeMode),
        items: [
          ...THEMES.map((t) => ({
            key: t.key,
            icon: t.icon,
            label: t.label,
            extra: theme === t.key ? <CheckOutlined /> : undefined,
          })),
          { type: 'divider' as const },
          {
            key: 'info',
            disabled: true,
            label: `Đang hiển thị: ${isDark ? 'tối' : 'sáng'}${theme === 'system' ? ' (theo thiết bị)' : ''}`,
          },
        ],
      }}
    >
      <Button type="text" aria-label="Giao diện" title={`Giao diện: ${cur.label}`} icon={cur.icon} />
    </Dropdown>
  );
}
