import { UploadOutlined } from '@ant-design/icons';
import { Button, Card, Col, Descriptions, Flex, Row, Typography, theme } from 'antd';
import { useSession } from '../../../shared/auth/session';
import PageHeader from '../../../shared/ui/PageHeader';
import PersonAvatar from '../../../shared/ui/PersonAvatar';
import { ThemeSegmented } from '../../../shared/ui/ThemeSwitch';

export default function MePage() {
  const { me } = useSession();
  const { token } = theme.useToken();
  if (!me) return null;
  return (
    <>
      <PageHeader title="Thông tin cá nhân & chữ ký" />
      <Row gutter={[16, 16]}>
        <Col xs={24} lg={12}>
          <Card>
            <Flex gap={14} align="center" style={{ marginBottom: 14 }}>
              <PersonAvatar id={me.id} name={me.fullName} size={56} />
              <div>
                <Typography.Text strong style={{ fontSize: 17 }}>
                  {me.fullName}
                </Typography.Text>
                <div>
                  <Typography.Link>{me.email}</Typography.Link>
                </div>
              </div>
            </Flex>
            <Descriptions
              column={1}
              size="small"
              items={[
                { key: 'u', label: 'Đơn vị', children: me.unitName ?? '—' },
                { key: 'j', label: 'Vị trí công việc', children: me.jobTitle ?? '—' },
                { key: 'e', label: 'Mã nhân viên', children: me.employeeCode ?? '—' },
                { key: 'p', label: 'Quyền', children: me.permissions.length ? me.permissions.join(', ') : 'Chưa được cấp quyền' },
              ]}
            />
            <Typography.Text type="secondary">Thông tin lấy từ tài khoản Keycloak / HRM, không sửa tại đây.</Typography.Text>
          </Card>
        </Col>
        <Col xs={24} lg={12}>
          <Card title="Chữ ký của tôi">
            <div
              style={{
                border: `1px dashed ${token.colorBorder}`,
                borderRadius: token.borderRadiusLG,
                padding: 20,
                textAlign: 'center',
                marginBottom: 12,
                fontFamily: 'cursive',
                fontSize: 24,
                color: token.colorPrimaryText,
              }}
            >
              {me.fullName}
            </div>
            <Button icon={<UploadOutlined />} disabled title="Chưa hỗ trợ">
              Tải ảnh chữ ký
            </Button>
            <Typography.Paragraph type="secondary" style={{ marginTop: 12, marginBottom: 0 }}>
              Tải ảnh chữ ký và chứng thư số chưa có trong phiên bản này.
            </Typography.Paragraph>
          </Card>
        </Col>
        <Col span={24}>
          <Card title="Giao diện hiển thị">
            <Typography.Paragraph type="secondary">
              Chọn giao diện sáng, tối hoặc tự theo cài đặt của thiết bị.
            </Typography.Paragraph>
            <ThemeSegmented />
          </Card>
        </Col>
      </Row>
    </>
  );
}
