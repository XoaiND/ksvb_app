import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { BrowserRouter } from 'react-router';
import App from './App';
import { initAuth } from './auth';
import { AppProvider } from './context/AppContext';
import './styles/app.css';

// Đăng nhập Keycloak trước khi dựng giao diện (giống HRM); VITE_AUTH_DISABLED=true thì bỏ qua (chỉ dev).
initAuth().then(() => {
  createRoot(document.getElementById('root')!).render(
    <StrictMode>
      <BrowserRouter>
        <AppProvider>
          <App />
        </AppProvider>
      </BrowserRouter>
    </StrictMode>,
  );
});
