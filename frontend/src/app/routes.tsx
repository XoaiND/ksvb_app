import { lazy, type ComponentType, type ReactElement } from 'react';
import { ADMIN_PERMISSIONS } from '../shared/auth/permissions';

// Mỗi màn một chunk riêng: tải lần đầu nhẹ hơn (Ant Design khá nặng).
const AdminPage = lazy(() => import('../features/admin/pages/AdminPage'));
const ComposePage = lazy(() => import('../features/compose/pages/ComposePage'));
const DashboardPage = lazy(() => import('../features/dashboard/pages/DashboardPage'));
const DocumentDetailPage = lazy(() => import('../features/documents/pages/DocumentDetailPage'));
const DocumentsPage = lazy(() => import('../features/documents/pages/DocumentsPage'));
const WatchingPage = lazy(() => import('../features/documents/pages/WatchingPage'));
const MePage = lazy(() => import('../features/me/pages/MePage'));
const ReportsPage = lazy(() => import('../features/reports/pages/ReportsPage'));
const TemplatesPage = lazy(() => import('../features/templates/pages/TemplatesPage'));

export interface AppRoute {
  path: string;
  element: ReactElement;
  /** Quyền cần có để vào trang (bất kỳ một). Không khai báo = ai đăng nhập cũng vào được. */
  needs?: string[];
  /** Thông báo khi thiếu quyền. */
  denied?: string;
}

const page = (C: ComponentType): ReactElement => <C />;

export const ROUTES: AppRoute[] = [
  { path: '/dashboard', element: page(DashboardPage) },
  { path: '/documents', element: page(DocumentsPage) },
  { path: '/documents/:id', element: page(DocumentDetailPage) },
  { path: '/documents/:id/sign', element: <DocumentDetailPage signMode /> },
  {
    path: '/compose',
    element: page(ComposePage),
    needs: ['document.create'],
    denied: 'Bạn chưa được cấp quyền soạn và trình ký văn bản (document.create).',
  },
  { path: '/watching', element: page(WatchingPage) },
  {
    path: '/templates',
    element: page(TemplatesPage),
    needs: ['document.create'],
    denied: 'Bạn chưa được cấp quyền dùng người nhận mẫu (document.create).',
  },
  {
    path: '/reports',
    element: page(ReportsPage),
    needs: ['report.view'],
    denied: 'Bạn chưa được cấp quyền xem báo cáo (report.view).',
  },
  { path: '/admin', element: page(AdminPage), needs: ADMIN_PERMISSIONS, denied: 'Bạn không có quyền truy cập trang Quản trị.' },
  { path: '/profile', element: page(MePage) },
];
