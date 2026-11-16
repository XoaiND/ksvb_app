package vn.vbi.ksvb.shared.security;

import java.util.List;
import org.springframework.security.access.AccessDeniedException;
import org.springframework.security.core.Authentication;
import org.springframework.security.core.GrantedAuthority;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.security.oauth2.jwt.Jwt;
import org.springframework.security.oauth2.server.resource.authentication.JwtAuthenticationToken;
import org.springframework.stereotype.Component;
import vn.vbi.ksvb.config.KsvbProperties;
import vn.vbi.ksvb.user.application.UserProvisioningService;
import vn.vbi.ksvb.user.domain.AppUser;
import vn.vbi.ksvb.user.infra.UserRepository;

/**
 * Người dùng đang thao tác (kèm quyền của lần gọi này).
 * <ul>
 *   <li>Chạy thật (ksvb.security.enabled=true): từ JWT Keycloak. Tìm theo email, chưa có thì tạo từ claim
 *       ({@code name}, {@code employee_code}, {@code unit_name}/{@code unit_code}, {@code position_name}/{@code position_code}).</li>
 *   <li>Dev/test (enabled=false): theo header {@code X-User-Id} do {@link DevUserFilter} đã xác thực.</li>
 * </ul>
 */
@Component
public class CurrentUser {

    private final UserRepository users;
    private final UserProvisioningService provisioning;
    private final KsvbProperties props;

    public CurrentUser(UserRepository users, UserProvisioningService provisioning, KsvbProperties props) {
        this.users = users;
        this.provisioning = provisioning;
        this.props = props;
    }

    /** Tên người đang thao tác cho cột created_by/updated_by (tối đa 50 ký tự); job nền / chưa đăng nhập = SYSTEM. */
    public static String username() {
        Authentication a = SecurityContextHolder.getContext().getAuthentication();
        if (a == null || a.getName() == null || "anonymousUser".equals(a.getName())) return "SYSTEM";
        String n = a.getName();
        return n.length() > 50 ? n.substring(0, 50) : n;
    }

    public AppUser get() {
        Authentication auth = SecurityContextHolder.getContext().getAuthentication();
        AppUser u = props.security().enabled() ? fromJwt(auth) : fromDev(auth);
        if (!u.isActive()) {
            throw new AccessDeniedException("Tài khoản đã bị vô hiệu hoá");
        }
        List<String> granted = auth.getAuthorities().stream().map(GrantedAuthority::getAuthority).toList();
        return u.withPermissions(granted);
    }

    private AppUser fromJwt(Authentication auth) {
        if (!(auth instanceof JwtAuthenticationToken token)) {
            throw new AccessDeniedException("Chưa đăng nhập");
        }
        Jwt jwt = token.getToken();
        String email = firstText(jwt.getClaimAsString("email"), jwt.getClaimAsString("preferred_username"));
        if (email == null) {
            throw new AccessDeniedException("Token không có thông tin email");
        }
        return provisioning.findOrCreate(new UserProvisioningService.Claims(
                email,
                firstText(jwt.getClaimAsString("name"), jwt.getClaimAsString("preferred_username")),
                jwt.getClaimAsString("employee_code"),
                firstText(jwt.getClaimAsString("unit_name"), jwt.getClaimAsString("unit_code")),
                firstText(jwt.getClaimAsString("position_name"), jwt.getClaimAsString("position_code"))));
    }

    private AppUser fromDev(Authentication auth) {
        if (auth == null || auth.getName() == null || "anonymousUser".equals(auth.getName())) {
            throw new AccessDeniedException("Không tìm thấy người dùng (header X-User-Id)");
        }
        return users.findByEmailIgnoreCase(auth.getName())
                .orElseThrow(() -> new AccessDeniedException("Không tìm thấy người dùng " + auth.getName()));
    }

    private static String firstText(String a, String b) {
        if (a != null && !a.isBlank()) return a;
        return b != null && !b.isBlank() ? b : null;
    }
}
