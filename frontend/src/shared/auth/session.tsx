import { useQuery } from '@tanstack/react-query';
import { createContext, useContext, useMemo, type ReactNode } from 'react';
import { errorMessage, get } from '../api/http';
import type { Me } from '../api/types';
import { hasPermission } from './permissions';

interface Session {
  /** Người đang đăng nhập (`/api/me`, gồm `permissions[]`); null khi đang tải hoặc lỗi. */
  me: Me | null;
  meError: string | null;
  /** Có quyền chi tiết (client role `<app>-api`, vd 'document.create') không. Chỉ để ẩn/hiện giao diện. */
  can: (permission: string) => boolean;
}

const Ctx = createContext<Session | null>(null);

/** Phiên đăng nhập: `/api/me` (TanStack Query, khoá `['me']`) và `can(quyền)`. */
export function SessionProvider({ children }: { children: ReactNode }) {
  const meQuery = useQuery({ queryKey: ['me'], queryFn: () => get<Me>('/me'), staleTime: Infinity });
  const me = meQuery.data ?? null;
  const meError = meQuery.error ? errorMessage(meQuery.error) : null;
  const value = useMemo<Session>(() => ({ me, meError, can: (p) => hasPermission(me, p) }), [me, meError]);
  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}

export function useSession(): Session {
  const v = useContext(Ctx);
  if (!v) throw new Error('useSession phải nằm trong SessionProvider');
  return v;
}
