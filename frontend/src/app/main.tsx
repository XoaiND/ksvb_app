import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { BrowserRouter } from 'react-router';
import dayjs from 'dayjs';
import 'dayjs/locale/vi';
import { initAuth } from '../shared/auth/keycloak';
import App from './App';
import AppProviders from './AppProviders';

dayjs.locale('vi');

const root = createRoot(document.getElementById('root')!);

// Đăng nhập Keycloak trước khi dựng giao diện; VITE_AUTH_DISABLED=true thì bỏ qua (chỉ dev).
initAuth()
  .then((ok) => {
    if (!ok) throw new Error('Đăng nhập thất bại');
    root.render(
      <StrictMode>
        <BrowserRouter>
          <AppProviders>
            <App />
          </AppProviders>
        </BrowserRouter>
      </StrictMode>,
    );
  })
  .catch((e) => {
    root.render(<div style={{ padding: 32, color: 'inherit' }}>Không kết nối được Keycloak: {String(e?.message ?? e)}</div>);
  });
