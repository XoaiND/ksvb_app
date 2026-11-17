import { Button, Result } from 'antd';
import { useNavigate } from 'react-router';
import { useNav } from '../layout/useNav';

/** Hiện khi người dùng vào route mà không có quyền (thay vì im lặng chuyển trang). */
export default function ForbiddenPage() {
  const nav = useNavigate();
  const { home } = useNav();
  return (
    <Result
      status="403"
      title="Không có quyền truy cập"
      subTitle="Tài khoản của bạn chưa được cấp quyền xem trang này."
      extra={
        <Button type="primary" onClick={() => nav(home)}>
          Về trang chính
        </Button>
      }
    />
  );
}
