import { Badge, Menu, type MenuProps } from 'antd';
import { useLocation, useNavigate, useSearchParams } from 'react-router';
import { usePendingCount } from '../../features/documents/hooks';
import { useSession } from '../../shared/auth/session';
import { NAV } from './nav';

/** Menu chính theo quyền; nhóm "Lưu trữ tài liệu" có 3 tab con, tab "Chờ tôi duyệt" kèm số việc chờ ký. */
export default function SideMenu({ collapsed, onNavigate }: { collapsed: boolean; onNavigate?: () => void }) {
  const { can } = useSession();
  const pending = usePendingCount();
  const nav = useNavigate();
  const loc = useLocation();
  const [params] = useSearchParams();

  const items: MenuProps['items'] = NAV.filter((n) => !n.needs || n.needs.some(can)).map((n) =>
    n.subs
      ? {
          key: n.to,
          icon: n.icon,
          label: n.title,
          children: n.subs.map((s) => ({
            key: `${n.to}?tab=${s.tab}`,
            label: (
              <span style={{ display: 'inline-flex', alignItems: 'center', gap: 8 }}>
                {s.title}
                {s.badge && pending > 0 && <Badge count={pending} size="small" />}
              </span>
            ),
          })),
        }
      : { key: n.to, icon: n.icon, label: n.title },
  );

  const selected = loc.pathname === '/documents' ? `/documents?tab=${params.get('tab') ?? '1'}` : loc.pathname;

  return (
    <nav aria-label="Menu chính">
      <Menu
        mode="inline"
        inlineCollapsed={collapsed}
        selectedKeys={[selected]}
        defaultOpenKeys={['/documents']}
        items={items}
        style={{ borderInlineEnd: 0 }}
        onClick={({ key }) => {
          onNavigate?.();
          nav(key);
        }}
      />
    </nav>
  );
}
