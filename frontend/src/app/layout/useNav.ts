import { useCallback, useMemo } from 'react';
import { useSession } from '../../shared/auth/session';
import { FALLBACK_HOME, NAV, type NavItem } from '../nav';

/** Menu theo quyền của người dùng: nhóm/mục được phép, các mục lá, trang mặc định (`home`). */
export function useNav() {
  const { can } = useSession();
  const allowed = useCallback(
    (i: NavItem): NavItem | null => {
      if (i.perm && !(Array.isArray(i.perm) ? i.perm.some(can) : can(i.perm))) return null;
      if (!i.children) return i;
      const kids = i.children.map(allowed).filter((x): x is NavItem => !!x);
      return kids.length ? { ...i, children: kids } : null;
    },
    [can],
  );
  const navItems = useMemo(() => NAV.map(allowed).filter((x): x is NavItem => !!x), [allowed]);
  const leaves = useMemo(() => navItems.flatMap((i) => i.children ?? [i]), [navItems]);
  const home = leaves[0]?.key ?? FALLBACK_HOME;
  return { navItems, leaves, home };
}
