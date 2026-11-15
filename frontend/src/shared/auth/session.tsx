import { useQuery } from '@tanstack/react-query';
import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from 'react';
import { request } from '../api/http';
import { queryKeys } from '../api/queryClient';
import type { Me } from '../api/types';
import { hasPermission } from './permissions';
import { errorText } from '../format';
import { readThemeMode, saveThemeMode, systemPrefersDark, type ThemeMode } from '../theme/theme';

interface Session {
  /** Người đang đăng nhập (`/api/me`, gồm `permissions[]`); null khi đang tải hoặc lỗi. */
  me: Me | null;
  meError: string | null;
  can: (permission: string) => boolean;
  theme: ThemeMode;
  setTheme: (t: ThemeMode) => void;
  isDark: boolean;
  collapsed: boolean;
  toggleSidebar: () => void;
}

const Ctx = createContext<Session | null>(null);
const SIDEBAR_KEY = 'ksvb.sidebar.collapsed';

export function SessionProvider({ children }: { children: ReactNode }) {
  const meQuery = useQuery({ queryKey: queryKeys.me, queryFn: () => request<Me>('GET', '/me'), staleTime: Infinity });
  const [theme, setThemeState] = useState<ThemeMode>(readThemeMode);
  const [sysDark, setSysDark] = useState<boolean>(systemPrefersDark);
  const [collapsed, setCollapsed] = useState<boolean>(() => {
    try {
      return localStorage.getItem(SIDEBAR_KEY) === '1';
    } catch {
      return false;
    }
  });

  const isDark = theme === 'dark' || (theme === 'system' && sysDark);

  useEffect(() => {
    // để CSS ngoài Ant Design (thanh cuộn, nền trang) theo đúng sáng/tối
    document.documentElement.setAttribute('data-theme', isDark ? 'dark' : 'light');
  }, [isDark]);

  useEffect(() => {
    if (!window.matchMedia) return;
    const mq = window.matchMedia('(prefers-color-scheme: dark)');
    const on = () => setSysDark(mq.matches);
    mq.addEventListener?.('change', on);
    return () => mq.removeEventListener?.('change', on);
  }, []);

  const setTheme = useCallback((t: ThemeMode) => {
    setThemeState(t);
    saveThemeMode(t);
  }, []);

  const toggleSidebar = useCallback(() => {
    setCollapsed((c) => {
      try {
        localStorage.setItem(SIDEBAR_KEY, c ? '0' : '1');
      } catch {
        /* bỏ qua */
      }
      return !c;
    });
  }, []);

  const me = meQuery.data ?? null;
  const meError = meQuery.error ? errorText(meQuery.error) : null;
  const value = useMemo<Session>(
    () => ({ me, meError, can: (p) => hasPermission(me, p), theme, setTheme, isDark, collapsed, toggleSidebar }),
    [me, meError, theme, setTheme, isDark, collapsed, toggleSidebar],
  );
  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}

export function useSession(): Session {
  const v = useContext(Ctx);
  if (!v) throw new Error('useSession phải nằm trong SessionProvider');
  return v;
}
