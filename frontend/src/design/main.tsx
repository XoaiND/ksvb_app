/**
 * Entry của bản preview bấm thử (`npm run build:design` → `docs/design/index.html`, một file, mở trực tiếp được).
 * Dùng đúng giao diện thật (app/ features/ shared/) với backend giả trong bộ nhớ; mở thẳng một màn bằng `#/đường-dẫn`.
 */
import { EyeOutlined } from '@ant-design/icons';
import { Dropdown, FloatButton } from 'antd';
import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { HashRouter } from 'react-router';
import App from '../app/App';
import AppProviders from '../app/AppProviders';
import '../shared/theme/global.css';
import { installDemoBackend, ROLES } from './demoBackend';

const ROLE_KEY = 'ksvb.preview.role';
const readRole = () => {
  try {
    return localStorage.getItem(ROLE_KEY) ?? 'role.leader';
  } catch {
    return 'role.leader';
  }
};
const role = ROLES[readRole()] ? readRole() : 'role.leader';
installDemoBackend(ROLES[role].perms);

function RoleSwitcher() {
  return (
    <Dropdown
      trigger={['click']}
      placement="topRight"
      menu={{
        selectable: true,
        selectedKeys: [role],
        items: Object.entries(ROLES).map(([k, v]) => ({ key: k, label: v.label })),
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
      <FloatButton icon={<EyeOutlined />} tooltip={`Preview: ${ROLES[role].label}`} />
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
