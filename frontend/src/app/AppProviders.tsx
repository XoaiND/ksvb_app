import { QueryClientProvider, type QueryClient } from '@tanstack/react-query';
import { App as AntApp, ConfigProvider } from 'antd';
import viVN from 'antd/locale/vi_VN';
import { useState, type ReactNode } from 'react';
import { createQueryClient } from '../shared/api/queryClient';
import { SessionProvider, useSession } from '../shared/auth/session';
import { buildTheme } from '../shared/theme/theme';

function ThemedApp({ children }: { children: ReactNode }) {
  const { isDark } = useSession();
  return (
    <ConfigProvider locale={viVN} theme={buildTheme(isDark)}>
      <AntApp message={{ maxCount: 3, duration: 3.5 }}>{children}</AntApp>
    </ConfigProvider>
  );
}

/** TanStack Query + phiên đăng nhập + theme Ant Design (sáng/tối/theo hệ thống). */
export default function AppProviders({ children, client }: { children: ReactNode; client?: QueryClient }) {
  const [qc] = useState(() => client ?? createQueryClient());
  return (
    <QueryClientProvider client={qc}>
      <SessionProvider>
        <ThemedApp>{children}</ThemedApp>
      </SessionProvider>
    </QueryClientProvider>
  );
}
