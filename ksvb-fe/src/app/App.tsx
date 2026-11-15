import { lazy, Suspense } from 'react';
import { Navigate, Route, Routes } from 'react-router';
import { Loading } from '../shared/ui/PageState';
import AppLayout from './layout/AppLayout';

// Mỗi màn một chunk riêng: tải lần đầu nhẹ hơn (Ant Design khá nặng).
const AdminPage = lazy(() => import('../features/admin/AdminPage'));
const LoginPage = lazy(() => import('../features/auth/LoginPage'));
const ComposePage = lazy(() => import('../features/compose/ComposePage'));
const DashboardPage = lazy(() => import('../features/dashboard/DashboardPage'));
const DocumentDetailPage = lazy(() => import('../features/documents/DocumentDetailPage'));
const DocumentsPage = lazy(() => import('../features/documents/DocumentsPage'));
const WatchingPage = lazy(() => import('../features/documents/WatchingPage'));
const ProfilePage = lazy(() => import('../features/profile/ProfilePage'));
const ReportsPage = lazy(() => import('../features/reports/ReportsPage'));
const TemplatesPage = lazy(() => import('../features/templates/TemplatesPage'));

export default function App() {
  return (
    <Suspense fallback={<Loading />}>
      <Routes>
        <Route path="/login" element={<LoginPage />} />
        <Route element={<AppLayout />}>
          <Route path="/dashboard" element={<DashboardPage />} />
          <Route path="/documents" element={<DocumentsPage />} />
          <Route path="/documents/:id" element={<DocumentDetailPage />} />
          <Route path="/documents/:id/sign" element={<DocumentDetailPage signMode />} />
          <Route path="/compose" element={<ComposePage />} />
          <Route path="/watching" element={<WatchingPage />} />
          <Route path="/templates" element={<TemplatesPage />} />
          <Route path="/reports" element={<ReportsPage />} />
          <Route path="/admin" element={<AdminPage />} />
          <Route path="/profile" element={<ProfilePage />} />
        </Route>
        <Route path="*" element={<Navigate to="/dashboard" replace />} />
      </Routes>
    </Suspense>
  );
}
