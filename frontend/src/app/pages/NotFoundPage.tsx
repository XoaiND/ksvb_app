import { Button, Result } from 'antd';
import { useNavigate } from 'react-router';
import { useNav } from '../layout/useNav';

/** Đường dẫn không tồn tại. */
export default function NotFoundPage() {
  const nav = useNavigate();
  const { home } = useNav();
  return (
    <Result
      status="404"
      title="Không tìm thấy trang"
      subTitle="Đường dẫn không tồn tại hoặc đã được di chuyển."
      extra={
        <Button type="primary" onClick={() => nav(home)}>
          Về trang chính
        </Button>
      }
    />
  );
}
