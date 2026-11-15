import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { BrowserRouter } from 'react-router';
import { initAuth } from '../shared/auth/keycloak';
import '../shared/theme/global.css';
import App from './App';
import AppProviders from './AppProviders';

// Đăng nhập Keycloak trước khi dựng giao diện (giống HRM); VITE_AUTH_DISABLED=true thì bỏ qua (chỉ dev).
initAuth().then(() => {
  createRoot(document.getElementById('root')!).render(
    <StrictMode>
      <BrowserRouter>
        <AppProviders>
          <App />
        </AppProviders>
      </BrowserRouter>
    </StrictMode>,
  );
});
