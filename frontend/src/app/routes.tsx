import { lazy, type ComponentType, type LazyExoticComponent, type ReactNode } from 'react';
import { Navigate } from 'react-router';
import { ADMIN_PERMISSIONS } from '../shared/auth/permissions';
const NotFoundPage = lazy(() => import('./pages/NotFoundPage'));
const AdminPage = lazy(() => import('../features/admin/pages/AdminPage'));
const ComposePage = lazy(() => import('../features/compose/pages/ComposePage'));
const DashboardPage = lazy(() => import('../features/dashboard/pages/DashboardPage'));
const DocumentDetailPage = lazy(() => import('../features/documents/pages/DocumentDetailPage'));
const DocumentSignPage = lazy(() => import('../features/documents/pages/DocumentSignPage'));
const DocumentsPage = lazy(() => import('../features/documents/pages/DocumentsPage'));
const WatchingPage = lazy(() => import('../features/documents/pages/WatchingPage'));
const MePage = lazy(() => import('../features/me/pages/MePage'));
const ReportsPage = lazy(() => import('../features/reports/pages/ReportsPage'));
const TemplatesPage = lazy(() => import('../features/templates/pages/TemplatesPage'));

/**
 * RIÊNG của app: danh sách route và quyền cần có (App.tsx chỉ đọc `ROUTES`). Thiếu `perm` = chỉ cần đăng nhập;
 * `perm` là một quyền hoặc mảng quyền (có một quyền là đủ); thiếu quyền thì hiện trang "Không có quyền".
 * Trang tải lười bằng `component` (React.lazy, App.tsx bọc Suspense); chuyển hướng dùng `element`.
 */
export interface RouteDef {
  path?: string;
  index?: boolean;
  perm?: string | string[];
  element?: ReactNode;
  component?: LazyExoticComponent<ComponentType>;
  children?: RouteDef[];
}

export const ROUTES: RouteDef[] = [
  { path: '/', element: <Navigate to="/dashboard" replace /> },
  { path: '/dashboard', component: DashboardPage },
  { path: '/documents', component: DocumentsPage },
  { path: '/documents/:id', component: DocumentDetailPage },
  { path: '/documents/:id/sign', component: DocumentSignPage },
  { path: '/compose', perm: 'document.create', component: ComposePage },
  { path: '/watching', component: WatchingPage },
  { path: '/templates', perm: 'document.create', component: TemplatesPage },
  { path: '/reports', perm: 'report.view', component: ReportsPage },
  { path: '/admin', perm: ADMIN_PERMISSIONS, component: AdminPage },
  { path: '/profile', component: MePage },
  { path: '*', component: NotFoundPage },
];
