/**
 * Entry của bản preview bấm thử (`npm run build:design` → `docs/design/index.html`, một file, mở trực tiếp được).
 * Dùng đúng giao diện thật (app/ features/ shared/) với backend giả trong bộ nhớ; mở thẳng một màn bằng `#/đường-dẫn`.
 */
import { EyeOutlined } from '@ant-design/icons';
import { Dropdown, FloatButton } from 'antd';
import dayjs from 'dayjs';
import 'dayjs/locale/vi';
import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { HashRouter } from 'react-router';
import App from '../app/App';
import AppProviders from '../app/AppProviders';
import { ROLE_LABEL, ROLE_PERMISSIONS } from '../shared/auth/permissions';
import { installDemoBackend } from './demoBackend';

dayjs.locale('vi');

const ROLE_KEY = 'ksvb.preview.role';
const readRole = () => {
  try {
    return localStorage.getItem(ROLE_KEY) ?? 'role.admin';
  } catch {
    return 'role.admin';
  }
};
const role = ROLE_PERMISSIONS[readRole()] ? readRole() : 'role.admin';
installDemoBackend(ROLE_PERMISSIONS[role]);

function RoleSwitcher() {
  return (
    <Dropdown
      trigger={['click']}
      placement="topRight"
      menu={{
        selectable: true,
        selectedKeys: [role],
        items: Object.keys(ROLE_PERMISSIONS).map((k) => ({ key: k, label: `${ROLE_LABEL[k] ?? k} (${k})` })),
        onClick: ({ key }) => {
          try {
            localStorage.setItem(ROLE_KEY, key);
          } catch {
            /* bỏ qua */
          }
          window.location.reload();
        },
      }}
    >
      <FloatButton icon={<EyeOutlined />} tooltip={`Preview: ${ROLE_LABEL[role] ?? role}`} />
    </Dropdown>
  );
}

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <HashRouter>
      <AppProviders>
        <App />
        <RoleSwitcher />
      </AppProviders>
    </HashRouter>
  </StrictMode>,
);
