import {
  BarChartOutlined,
  EditOutlined,
  EyeOutlined,
  FolderOutlined,
  HomeOutlined,
  SettingOutlined,
  TeamOutlined,
} from '@ant-design/icons';
import type { ReactNode } from 'react';
import { ADMIN_PERMISSIONS } from '../shared/auth/permissions';

export interface NavItem {
  to: string;
  title: string;
  icon: ReactNode;
  /** Quyền cần có để thấy mục (bất kỳ một). Không khai báo = ai đăng nhập cũng thấy. */
  needs?: string[];
  subs?: { tab: string; title: string; badge?: boolean }[];
}

export const NAV: NavItem[] = [
  { to: '/dashboard', title: 'Dashboard', icon: <HomeOutlined /> },
  { to: '/compose', title: 'Soạn tài liệu mới', icon: <EditOutlined />, needs: ['document.create'] },
  {
    to: '/documents',
    title: 'Lưu trữ tài liệu',
    icon: <FolderOutlined />,
    subs: [
      { tab: '1', title: 'Chờ tôi duyệt', badge: true },
      { tab: '2', title: 'Tài liệu cá nhân' },
      { tab: '3', title: 'Tài liệu chung' },
    ],
  },
  { to: '/watching', title: 'Tôi theo dõi', icon: <EyeOutlined /> },
  { to: '/templates', title: 'Người nhận mẫu', icon: <TeamOutlined />, needs: ['document.create'] },
  { to: '/reports', title: 'Báo cáo', icon: <BarChartOutlined />, needs: ['report.view'] },
  { to: '/admin', title: 'Quản trị', icon: <SettingOutlined />, needs: ADMIN_PERMISSIONS },
];
