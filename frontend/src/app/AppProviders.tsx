import { QueryClientProvider, type QueryClient } from '@tanstack/react-query';
import { App as AntApp } from 'antd';
import { useState, type ReactNode } from 'react';
import { createQueryClient } from '../shared/api/queryClient';
import { SessionProvider } from '../shared/auth/session';
import { ThemeProvider } from '../shared/theme/ThemeProvider';

/** TanStack Query + theme Ant Design (sáng/tối/theo hệ thống) + phiên đăng nhập (`/api/me`, `can(quyền)`). */
export default function AppProviders({ children, client }: { children: ReactNode; client?: QueryClient }) {
  const [qc] = useState(() => client ?? createQueryClient());
  return (
    <QueryClientProvider client={qc}>
      <ThemeProvider>
        <AntApp message={{ maxCount: 3, duration: 3.5 }}>
          <SessionProvider>{children}</SessionProvider>
        </AntApp>
      </ThemeProvider>
    </QueryClientProvider>
  );
}
