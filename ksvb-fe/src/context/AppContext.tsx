import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from 'react';
import { api, type Me } from '../api';
import { errorText } from '../utils';

export type ThemeMode = 'light' | 'dark' | 'system';

interface Toast {
  id: number;
  msg: string;
  err?: boolean;
}

interface AppValue {
  /** Người đang đăng nhập (null khi đang tải hoặc lỗi — xem meError). */
  me: Me | null;
  meError: string | null;
  can: (permission: string) => boolean;
  /** Số văn bản đang chờ tôi ký (huy hiệu ở menu, chuông). */
  pendingCount: number;
  refreshPending: () => void;
  theme: ThemeMode;
  setTheme: (t: ThemeMode) => void;
  isDark: boolean;
  collapsed: boolean;
  toggleSidebar: () => void;
  toasts: Toast[];
  toast: (msg: string, err?: boolean) => void;
}

const Ctx = createContext<AppValue | null>(null);

function readTheme(): ThemeMode {
  try {
    const v = localStorage.getItem('ksvb.theme');
    return v === 'light' || v === 'dark' ? v : 'system';
  } catch {
    return 'system';
  }
}

function systemDark(): boolean {
  return !!(window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches);
}

export function AppProvider({ children }: { children: ReactNode }) {
  const [me, setMe] = useState<Me | null>(null);
  const [meError, setMeError] = useState<string | null>(null);
  const [pendingCount, setPendingCount] = useState(0);
  const [theme, setThemeState] = useState<ThemeMode>(readTheme);
  const [sysDark, setSysDark] = useState<boolean>(systemDark());
  const [collapsed, setCollapsed] = useState<boolean>(() => {
    try {
      return localStorage.getItem('ksvb.sidebar.collapsed') === '1';
    } catch {
      return false;
    }
  });
  const [toasts, setToasts] = useState<Toast[]>([]);

  const isDark = theme === 'dark' || (theme === 'system' && sysDark);

  useEffect(() => {
    document.documentElement.setAttribute('data-theme', isDark ? 'dark' : 'light');
  }, [isDark]);

  useEffect(() => {
    if (!window.matchMedia) return;
    const mq = window.matchMedia('(prefers-color-scheme: dark)');
    const on = () => setSysDark(mq.matches);
    mq.addEventListener?.('change', on);
    return () => mq.removeEventListener?.('change', on);
  }, []);

  useEffect(() => {
    let live = true;
    api
      .me()
      .then((m) => live && setMe(m))
      .catch((e) => live && setMeError(errorText(e)));
    return () => {
      live = false;
    };
  }, []);

  const refreshPending = useCallback(() => {
    api
      .listSignRequests({ scope: 'pending', size: 1 })
      .then((r) => setPendingCount(r.totalElements))
      .catch(() => undefined);
  }, []);

  useEffect(() => {
    if (me) refreshPending();
  }, [me, refreshPending]);

  const setTheme = useCallback((t: ThemeMode) => {
    setThemeState(t);
    try {
      localStorage.setItem('ksvb.theme', t);
    } catch {
      /* bỏ qua */
    }
  }, []);

  const toggleSidebar = useCallback(() => {
    setCollapsed((c) => {
      try {
        localStorage.setItem('ksvb.sidebar.collapsed', c ? '0' : '1');
      } catch {
        /* bỏ qua */
      }
      return !c;
    });
  }, []);

  const toast = useCallback((msg: string, err?: boolean) => {
    const id = Date.now() + Math.random();
    setToasts((t) => [...t, { id, msg, err }]);
    setTimeout(() => setToasts((t) => t.filter((x) => x.id !== id)), 3500);
  }, []);

  const value = useMemo<AppValue>(
    () => ({
      me,
      meError,
      can: (p: string) => !!me?.permissions.includes(p),
      pendingCount,
      refreshPending,
      theme,
      setTheme,
      isDark,
      collapsed,
      toggleSidebar,
      toasts,
      toast,
    }),
    [me, meError, pendingCount, refreshPending, theme, setTheme, isDark, collapsed, toggleSidebar, toasts, toast],
  );

  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}

export function useApp(): AppValue {
  const v = useContext(Ctx);
  if (!v) throw new Error('useApp phải nằm trong AppProvider');
  return v;
}
