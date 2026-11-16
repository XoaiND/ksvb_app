import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from 'react';
import { ConfigProvider, theme as antTheme } from 'antd';
import viVN from 'antd/locale/vi_VN';

export type ThemeMode = 'light' | 'dark' | 'system';

const KEY = 'ksvb.theme';

function readMode(): ThemeMode {
  try {
    const v = localStorage.getItem(KEY);
    return v === 'light' || v === 'dark' ? v : 'system';
  } catch {
    return 'system';
  }
}

const systemDark = () => window.matchMedia?.('(prefers-color-scheme: dark)').matches ?? false;

interface ThemeCtx {
  mode: ThemeMode;
  setMode: (m: ThemeMode) => void;
  isDark: boolean;
}
const Ctx = createContext<ThemeCtx | null>(null);

/**
 * Giao diện sáng / tối / theo hệ thống (docs/kien-truc-chuan.md mục 4). Lưu lựa chọn ở localStorage; chế độ "hệ thống"
 * tự đổi khi thiết bị đổi chế độ sáng-tối. index.html đặt sẵn data-theme từ sớm để không bị chớp khi tải trang.
 * Màu chỉ lấy qua theme.useToken(), không ghi cứng trong component.
 */
export function ThemeProvider({ children }: { children: ReactNode }) {
  const [mode, setModeState] = useState<ThemeMode>(readMode);
  const [sysDark, setSysDark] = useState(systemDark);

  useEffect(() => {
    const mq = window.matchMedia?.('(prefers-color-scheme: dark)');
    if (!mq) return;
    const onChange = () => setSysDark(mq.matches);
    mq.addEventListener('change', onChange);
    return () => mq.removeEventListener('change', onChange);
  }, []);

  const isDark = mode === 'dark' || (mode === 'system' && sysDark);

  useEffect(() => {
    document.documentElement.dataset.theme = isDark ? 'dark' : 'light';
    document.documentElement.style.colorScheme = isDark ? 'dark' : 'light';
  }, [isDark]);

  const setMode = useCallback((m: ThemeMode) => {
    setModeState(m);
    try {
      localStorage.setItem(KEY, m);
    } catch {
      /* bỏ qua: chế độ riêng tư */
    }
  }, []);

  const value = useMemo(() => ({ mode, setMode, isDark }), [mode, setMode, isDark]);

  return (
    <Ctx.Provider value={value}>
      <ConfigProvider
        locale={viVN}
        theme={{
          algorithm: isDark ? antTheme.darkAlgorithm : antTheme.defaultAlgorithm,
          // xanh đậm hơn #1677ff để chữ trắng trên nút đạt độ tương phản >= 4,5
          token: { colorPrimary: '#1668dc', borderRadius: 6 },
        }}
      >
        {children}
      </ConfigProvider>
    </Ctx.Provider>
  );
}

export function useTheme(): ThemeCtx {
  const v = useContext(Ctx);
  if (!v) throw new Error('useTheme phải nằm trong ThemeProvider');
  return v;
}
