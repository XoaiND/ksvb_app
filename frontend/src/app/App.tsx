import type { ReactNode } from 'react';
import { Navigate, useRoutes, type RouteObject } from 'react-router';
import { useSession } from '../shared/auth/session';
import AppLayout from './layout/AppLayout';
import { useNav } from './layout/useNav';
import { ROUTES, type RouteDef } from './routes';

/** Route của ứng dụng (trong khung AppLayout); route cần quyền tự chuyển về trang mặc định khi thiếu quyền. */
export default function App() {
  const { can } = useSession();
  const { home } = useNav();
  const guard = (perm: string | undefined, el: ReactNode) => (!perm || can(perm) ? el : <Navigate to={home} replace />);
  const toObject = (r: RouteDef): RouteObject =>
    r.index
      ? { index: true, element: guard(r.perm, r.element) }
      : { path: r.path, element: guard(r.perm, r.element), children: r.children?.map(toObject) };

  return <AppLayout>{useRoutes(ROUTES.map(toObject))}</AppLayout>;
}
