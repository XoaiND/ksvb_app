package ksvb.shared.security;

import org.springframework.security.core.Authentication;
import org.springframework.security.core.context.SecurityContextHolder;

/** Username nguoi dang thao tac, ghi vao created_by / updated_by. */
public final class CurrentUser {
    private CurrentUser() {}

    public static String username() {
        Authentication a = SecurityContextHolder.getContext().getAuthentication();
        if (a == null || a.getName() == null) return "SYSTEM";
        String n = a.getName();
        return n.length() > 50 ? n.substring(0, 50) : n;
    }
}
