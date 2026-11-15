import Avatar from '../components/Avatar';
import Icon from '../components/Icon';
import { ThemeSeg } from '../components/ThemeSwitch';
import { useApp } from '../context/AppContext';

export default function Profile() {
  const { me } = useApp();
  if (!me) return null;
  return (
    <>
      <div className="pg-t">
        <h2>Thông tin cá nhân & chữ ký</h2>
      </div>
      <div className="grid g2">
        <div className="card">
          <div style={{ display: 'flex', gap: 14, alignItems: 'center', marginBottom: 14 }}>
            <Avatar id={me.id} name={me.fullName} size={56} />
            <div>
              <b style={{ fontSize: 17 }}>{me.fullName}</b>
              <div style={{ color: 'var(--link)' }}>{me.email}</div>
            </div>
          </div>
          <table className="tbl">
            <tbody>
              <tr>
                <td className="mut">Đơn vị</td>
                <td>{me.unitName ?? '—'}</td>
              </tr>
              <tr>
                <td className="mut">Vị trí công việc</td>
                <td>{me.jobTitle ?? '—'}</td>
              </tr>
              <tr>
                <td className="mut">Mã nhân viên</td>
                <td>{me.employeeCode ?? '—'}</td>
              </tr>
              <tr>
                <td className="mut">Quyền</td>
                <td>{me.permissions.length ? me.permissions.join(', ') : 'Chưa được cấp quyền'}</td>
              </tr>
            </tbody>
          </table>
          <p className="mut" style={{ marginBottom: 0 }}>
            Thông tin lấy từ tài khoản Keycloak / HRM, không sửa tại đây.
          </p>
        </div>
        <div className="card">
          <h3>Chữ ký của tôi</h3>
          <div style={{ border: '1px dashed var(--line)', borderRadius: 8, padding: 20, textAlign: 'center', marginBottom: 12 }}>
            <span className="sigimg">{me.fullName}</span>
          </div>
          <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
            <button className="btn" disabled title="Chưa hỗ trợ">
              <Icon name="upload" size={16} />
              Tải ảnh chữ ký
            </button>
          </div>
          <p className="mut" style={{ marginBottom: 0 }}>
            Tải ảnh chữ ký và chứng thư số chưa có trong phiên bản này.
          </p>
        </div>
      </div>
      <div className="card" style={{ marginTop: 16 }}>
        <h3>Giao diện hiển thị</h3>
        <p className="mut" style={{ marginTop: 0 }}>
          Chọn giao diện sáng, tối hoặc tự theo cài đặt của thiết bị.
        </p>
        <ThemeSeg />
      </div>
    </>
  );
}
