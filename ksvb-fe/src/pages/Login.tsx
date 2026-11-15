import { useNavigate } from 'react-router';
import Icon from '../components/Icon';
import { ThemeSeg } from '../components/ThemeSwitch';
import { authDisabled, login } from '../auth';

export default function Login() {
  const nav = useNavigate();
  return (
    <div className="login">
      <div style={{ position: 'fixed', top: 12, right: 12, zIndex: 5 }}>
        <ThemeSeg />
      </div>
      <div className="card">
        <div style={{ display: 'flex', justifyContent: 'center', color: 'var(--brand)' }}>
          <Icon name="shield" size={44} />
        </div>
        <h2 style={{ margin: '10px 0 4px' }}>Ký số văn bản</h2>
        <p className="mut" style={{ margin: '0 0 22px' }}>
          Soạn, trình ký và theo dõi văn bản điện tử
        </p>
        <button
          className="btn pri"
          style={{ width: '100%', justifyContent: 'center', height: 40 }}
          onClick={() => (authDisabled ? nav('/dashboard') : login())}
        >
          Đăng nhập bằng tài khoản công ty (SSO)
        </button>
        <p className="mut" style={{ fontSize: 12, margin: '16px 0 0' }}>
          Bạn sẽ được chuyển đến trang đăng nhập Keycloak của công ty.
        </p>
      </div>
    </div>
  );
}
