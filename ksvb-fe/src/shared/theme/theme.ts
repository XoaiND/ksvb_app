import { theme as antdTheme, type ThemeConfig } from 'antd';

export type ThemeMode = 'light' | 'dark' | 'system';

/** Màu chủ đạo chung của hệ sinh thái (ECOSYSTEM.md 8, 12.3). Mọi màu khác lấy qua `theme.useToken()`. */
export const BRAND_PRIMARY = '#1668dc';

export function buildTheme(isDark: boolean): ThemeConfig {
  return {
    algorithm: isDark ? antdTheme.darkAlgorithm : antdTheme.defaultAlgorithm,
    token: {
      colorPrimary: BRAND_PRIMARY,
      borderRadius: 8,
      fontFamily: 'Inter, system-ui, -apple-system, "Segoe UI", Roboto, sans-serif',
    },
    components: { Layout: { headerPadding: '0 16px' } },
  };
}

const THEME_KEY = 'ksvb.theme';

export function readThemeMode(): ThemeMode {
  try {
    const v = localStorage.getItem(THEME_KEY);
    return v === 'light' || v === 'dark' ? v : 'system';
  } catch {
    return 'system';
  }
}

export function saveThemeMode(t: ThemeMode) {
  try {
    localStorage.setItem(THEME_KEY, t);
  } catch {
    /* bỏ qua: trình duyệt chặn lưu */
  }
}

export const systemPrefersDark = (): boolean =>
  !!(window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches);
