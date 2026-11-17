import { Suspense, type ReactNode } from 'react';
import { useRoutes, type RouteObject } from 'react-router';
import { useSession } from '../shared/auth/session';
import { Loading } from '../shared/ui/PageState';
import AppLayout from './layout/AppLayout';
import ForbiddenPage from './pages/ForbiddenPage';
import { ROUTES, type RouteDef } from './routes';

/** Route của ứng dụng (trong khung AppLayout): trang tải lười (Suspense), thiếu quyền hiện trang "Không có quyền". */
export default function App() {
  const { can } = useSession();
  const allowed = (perm: RouteDef['perm']) => !perm || (Array.isArray(perm) ? perm.some(can) : can(perm));
  const body = (r: RouteDef): ReactNode => {
    if (!allowed(r.perm)) return <ForbiddenPage />;
    if (r.component) {
      const Page = r.component;
      return <Page />;
    }
    return r.element;
  };
  const toObject = (r: RouteDef): RouteObject =>
    r.index ? { index: true, element: body(r) } : { path: r.path, element: body(r), children: r.children?.map(toObject) };

  const routes = useRoutes(ROUTES.map(toObject));
  return (
    <AppLayout>
      <Suspense fallback={<Loading />}>{routes}</Suspense>
    </AppLayout>
  );
}
