import { SafetyCertificateOutlined } from '@ant-design/icons';
import { Button, Card, Flex, Typography, theme } from 'antd';
import { useNavigate } from 'react-router';
import { authDisabled, login } from '../../shared/auth/keycloak';
import { ThemeSegmented } from '../../shared/ui/ThemeSwitch';

export default function LoginPage() {
  const nav = useNavigate();
  const { token } = theme.useToken();
  return (
    <Flex justify="center" align="center" style={{ minHeight: '100vh', background: token.colorBgLayout, padding: 16 }}>
      <div style={{ position: 'fixed', top: 12, right: 12 }}>
        <ThemeSegmented />
      </div>
      <Card style={{ width: 380, maxWidth: '100%', textAlign: 'center' }}>
        <SafetyCertificateOutlined style={{ fontSize: 44, color: token.colorPrimary }} />
        <Typography.Title level={3} style={{ margin: '10px 0 4px' }}>
          Ký số văn bản
        </Typography.Title>
        <Typography.Paragraph type="secondary">Soạn, trình ký và theo dõi văn bản điện tử</Typography.Paragraph>
        <Button type="primary" block size="large" onClick={() => (authDisabled ? nav('/dashboard') : login())}>
          Đăng nhập bằng tài khoản công ty (SSO)
        </Button>
        <Typography.Paragraph type="secondary" style={{ fontSize: 12, margin: '16px 0 0' }}>
          Bạn sẽ được chuyển đến trang đăng nhập Keycloak của công ty.
        </Typography.Paragraph>
      </Card>
    </Flex>
  );
}
