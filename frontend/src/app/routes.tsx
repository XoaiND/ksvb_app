import { Navigate } from 'react-router';
import type { ReactNode } from 'react';
import AdminPage from '../features/admin/pages/AdminPage';
import ComposePage from '../features/compose/pages/ComposePage';
import DashboardPage from '../features/dashboard/pages/DashboardPage';
import DocumentDetailPage from '../features/documents/pages/DocumentDetailPage';
import DocumentsPage from '../features/documents/pages/DocumentsPage';
import WatchingPage from '../features/documents/pages/WatchingPage';
import MePage from '../features/me/pages/MePage';
import ReportsPage from '../features/reports/pages/ReportsPage';
import TemplatesPage from '../features/templates/pages/TemplatesPage';
import type { Permission } from '../shared/api/types';
import { useNav } from './layout/useNav';

/**
 * RIÊNG của app: danh sách route và quyền cần có (App.tsx chỉ đọc `ROUTES`). Thiếu `perm` = chỉ cần đăng nhập;
 * thiếu quyền thì chuyển về trang mặc định.
 */
export interface RouteDef {
  path?: string;
  index?: boolean;
  perm?: Permission;
  element: ReactNode;
  children?: RouteDef[];
}

/** Chuyển về trang mặc định theo quyền. */
function Home() {
  return <Navigate to={useNav().home} replace />;
}

export const ROUTES: RouteDef[] = [
  { path: '/dashboard', element: <DashboardPage /> },
  { path: '/documents', element: <DocumentsPage /> },
  { path: '/documents/:id', element: <DocumentDetailPage /> },
  { path: '/documents/:id/sign', element: <DocumentDetailPage signMode /> },
  { path: '/compose', perm: 'document.create', element: <ComposePage /> },
  { path: '/watching', element: <WatchingPage /> },
  { path: '/templates', perm: 'document.create', element: <TemplatesPage /> },
  { path: '/reports', perm: 'report.view', element: <ReportsPage /> },
  // Quản trị mở bằng bất kỳ một trong nhiều quyền: AdminPage tự báo khi thiếu quyền (RouteDef.perm chỉ nhận một quyền)
  { path: '/admin', element: <AdminPage /> },
  { path: '/profile', element: <MePage /> },
  { path: '*', element: <Home /> },
];
