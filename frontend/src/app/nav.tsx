import {
  BarChartOutlined,
  BellOutlined,
  EditOutlined,
  EyeOutlined,
  FolderOutlined,
  HomeOutlined,
  SafetyCertificateOutlined,
  SettingOutlined,
  TeamOutlined,
  UserOutlined,
} from '@ant-design/icons';
import { Badge, Button, Dropdown, Input } from 'antd';
import { useState, type ReactNode } from 'react';
import { useNavigate } from 'react-router';
import { usePendingCount } from '../features/documents/hooks';
import type { Me, Permission } from '../shared/api/types';
import { ADMIN_PERMISSIONS } from '../shared/auth/permissions';

/**
 * RIÊNG của app: cấu hình cho khung giao diện dùng chung (layout/*, App.tsx). Khung chỉ đọc các export ở đây.
 */

/** Mã app: tiền tố khoá localStorage của khung (vd. `ksvb.sidebar`). */
export const APP_ID = 'ksvb';

/** Tên và biểu tượng hiện ở đầu menu trái và ngăn kéo. */
export const BRAND: { name: string; icon: ReactNode } = { name: 'KSVB', icon: <SafetyCertificateOutlined /> };

/** perm: một quyền, hoặc danh sách quyền (có một trong số đó là đủ). */
export interface NavItem {
  key: string;
  icon?: ReactNode;
  label: string;
  perm?: Permission | Permission[];
  children?: NavItem[];
}

/** Menu hiện theo quyền: không có quyền xem thì ẩn hẳn mục đó (key là đường dẫn). */
export const NAV: NavItem[] = [
  { key: '/dashboard', icon: <HomeOutlined />, label: 'Dashboard' },
  { key: '/compose', icon: <EditOutlined />, label: 'Soạn tài liệu mới', perm: 'document.create' },
  { key: '/documents', icon: <FolderOutlined />, label: 'Lưu trữ tài liệu' },
  { key: '/watching', icon: <EyeOutlined />, label: 'Tôi theo dõi' },
  { key: '/templates', icon: <TeamOutlined />, label: 'Người nhận mẫu', perm: 'document.create' },
  { key: '/reports', icon: <BarChartOutlined />, label: 'Báo cáo', perm: 'report.view' },
  { key: '/admin', icon: <SettingOutlined />, label: 'Quản trị', perm: ADMIN_PERMISSIONS },
  { key: '/profile', icon: <UserOutlined />, label: 'Thông tin cá nhân & chữ ký' },
];

/** Tên hiển thị của người đang đăng nhập (thanh trên). */
export const userDisplayName = (me: Me | null): string => me?.fullName || me?.email || BRAND.name;

/** Số ổn định để chọn màu ảnh đại diện của người đang đăng nhập. */
export const userAvatarId = (me: Me | null): number => me?.id ?? 0;

/** Mục trong menu người dùng (ngoài "Đăng xuất"), mở route `path`. */
export const USER_MENU: { key: string; label: string; icon: ReactNode; path: string }[] = [
  { key: 'profile', label: 'Thông tin cá nhân & chữ ký', icon: <UserOutlined />, path: '/profile' },
];

/** Trang mặc định khi người dùng không có mục menu nào. */
export const FALLBACK_HOME = '/profile';

/** Slot đầu thanh trên (sau nút thu gọn menu): ô tìm tài liệu. */
export function TopbarStart({ narrow }: { narrow: boolean }) {
  const nav = useNavigate();
  const [q, setQ] = useState('');
  if (narrow) return null;
  const search = () => {
    const k = q.trim();
    if (k) nav(`/documents?tab=2&q=${encodeURIComponent(k)}`);
  };
  return (
    <Input.Search
      placeholder="Tìm tài liệu của tôi, mã hiệu..."
      aria-label="Tìm tài liệu"
      style={{ maxWidth: 300 }}
      value={q}
      onChange={(e) => setQ(e.target.value)}
      onSearch={search}
    />
  );
}

/** Slot cuối thanh trên (trước nút giao diện): chuông số văn bản đang chờ ký. */
export function TopbarEnd() {
  const nav = useNavigate();
  const pending = usePendingCount();
  return (
    <Dropdown
      trigger={['click']}
      menu={{
        items: [
          pending > 0
            ? { key: 'pending', label: `Có ${pending} tài liệu đang chờ bạn ký`, onClick: () => nav('/documents?tab=1') }
            : { key: 'none', label: 'Không có việc cần xử lý', disabled: true },
        ],
      }}
    >
      <Button
        type="text"
        aria-label="Thông báo"
        icon={
          <Badge count={pending} size="small">
            <BellOutlined />
          </Badge>
        }
      />
    </Dropdown>
  );
}
