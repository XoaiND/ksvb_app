package vn.vbi.ksvb.shared.security;

import java.util.List;
import java.util.Set;
import vn.vbi.ksvb.user.domain.UserRole;

/**
 * Quyền chi tiết = client role của client Keycloak {@code ksvb-api} (resource_access.ksvb-api.roles),
 * dùng trong {@code @PreAuthorize("hasAuthority('...')")}. Xem docs/phan-quyen.md.
 * Role tổng hợp (role.user, role.leader, role.admin) là composite role bên Keycloak, backend không kiểm tên role.
 */
public final class Permissions {

    public static final String DOCUMENT_CREATE = "document.create";
    public static final String DOCUMENT_SIGN = "document.sign";
    public static final String DOCUMENT_VIEW_ALL = "document.view.all";
    public static final String REPORT_VIEW = "report.view";
    public static final String USER_MANAGE = "user.manage";
    public static final String AUDIT_VIEW = "audit.view";
    public static final String CONFIG_MANAGE = "config.manage";
    public static final String CERT_MANAGE = "cert.manage";
    public static final String SYSTEM_MONITOR = "system.monitor";

    public static final List<String> ALL = List.of(DOCUMENT_CREATE, DOCUMENT_SIGN, DOCUMENT_VIEW_ALL, REPORT_VIEW,
            USER_MANAGE, AUDIT_VIEW, CONFIG_MANAGE, CERT_MANAGE, SYSTEM_MONITOR);

    /** Quyền của người dùng thường (role.user). */
    public static final List<String> USER = List.of(DOCUMENT_CREATE, DOCUMENT_SIGN);

    /**
     * Chỉ dùng ở chế độ dev (ksvb.security.enabled=false): suy quyền từ cột app_user.role.
     * Khi chạy thật quyền luôn lấy từ token Keycloak.
     */
    public static Set<String> forDevRole(UserRole role) {
        return role == UserRole.ADMIN ? Set.copyOf(ALL) : Set.copyOf(USER);
    }

    private Permissions() {}
}
