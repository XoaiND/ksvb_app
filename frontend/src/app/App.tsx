import { lazy, Suspense, type ReactElement } from 'react';
import { Navigate, Route, Routes } from 'react-router';
import { useSession } from '../shared/auth/session';
import { ErrorNote, Loading } from '../shared/ui/PageState';
import AppLayout from './layout/AppLayout';
import { ROUTES, type AppRoute } from './routes';

const LoginPage = lazy(() => import('./pages/LoginPage'));

/** Kiểm quyền vào trang theo `needs` của route; thiếu quyền thì báo `denied`. */
function Guard({ route }: { route: AppRoute }): ReactElement {
  const { can } = useSession();
  if (route.needs && !route.needs.some(can)) {
    return <ErrorNote error={new Error(route.denied ?? 'Bạn chưa được cấp quyền vào trang này.')} />;
  }
  return route.element;
}

export default function App() {
  return (
    <Suspense fallback={<Loading />}>
      <Routes>
        <Route path="/login" element={<LoginPage />} />
        <Route element={<AppLayout />}>
          {ROUTES.map((r) => (
            <Route key={r.path} path={r.path} element={<Guard route={r} />} />
          ))}
        </Route>
        <Route path="*" element={<Navigate to="/dashboard" replace />} />
      </Routes>
    </Suspense>
  );
}
