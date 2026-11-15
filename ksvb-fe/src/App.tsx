import { Navigate, Route, Routes } from 'react-router';
import Toasts from './components/Toasts';
import AppLayout from './layout/AppLayout';
import Admin from './pages/Admin';
import Compose from './pages/Compose';
import Dashboard from './pages/Dashboard';
import DocumentDetail from './pages/DocumentDetail';
import Documents from './pages/Documents';
import Login from './pages/Login';
import Profile from './pages/Profile';
import Reports from './pages/Reports';
import Templates from './pages/Templates';
import Watching from './pages/Watching';

export default function App() {
  return (
    <>
      <Routes>
        <Route path="/login" element={<Login />} />
        <Route element={<AppLayout />}>
          <Route path="/dashboard" element={<Dashboard />} />
          <Route path="/documents" element={<Documents />} />
          <Route path="/documents/:id" element={<DocumentDetail />} />
          <Route path="/documents/:id/sign" element={<DocumentDetail signMode />} />
          <Route path="/compose" element={<Compose />} />
          <Route path="/watching" element={<Watching />} />
          <Route path="/templates" element={<Templates />} />
          <Route path="/reports" element={<Reports />} />
          <Route path="/admin" element={<Admin />} />
          <Route path="/profile" element={<Profile />} />
        </Route>
        <Route path="*" element={<Navigate to="/dashboard" replace />} />
      </Routes>
      <Toasts />
    </>
  );
}
