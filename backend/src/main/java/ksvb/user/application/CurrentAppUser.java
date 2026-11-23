package ksvb.user.application;

import java.util.List;
import ksvb.config.KsvbProperties;
import ksvb.user.domain.AppUser;
import ksvb.user.infra.UserRepository;
import org.springframework.security.access.AccessDeniedException;
import org.springframework.security.core.Authentication;
import org.springframework.security.core.GrantedAuthority;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.security.oauth2.jwt.Jwt;
import org.springframework.security.oauth2.server.resource.authentication.JwtAuthenticationToken;
import org.springframework.stereotype.Component;

/**
 * Người dùng đang thao tác (kèm quyền của lần gọi này).
 * <ul>
 *   <li>Chạy thật (ksvb.security.enabled=true): từ JWT Keycloak. Tìm theo email, chưa có thì tạo từ claim
 *       ({@code name}, {@code employee_code}, {@code unit_name}/{@code unit_code}, {@code position_name}/{@code position_code}).</li>
 *   <li>Dev/test (enabled=false): theo header {@code X-User-Id} do {@link ksvb.shared.security.DevUserFilter} đã xác thực.</li>
 * </ul>
 */
@Component
public class CurrentAppUser {

    private final UserRepository users;
    private final UserProvisioningService provisioning;
    private final KsvbProperties props;

    public CurrentAppUser(UserRepository users, UserProvisioningService provisioning, KsvbProperties props) {
        this.users = users;
        this.provisioning = provisioning;
        this.props = props;
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
                fullName(jwt),
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

    /**
     * Họ tên theo thứ tự Việt (họ đệm + tên). Claim {@code name} do Keycloak ghép {@code firstName + lastName}
     * (thứ tự phương Tây) nên bị ngược với HRM (firstName = tên, lastName = họ đệm); vì vậy ưu tiên
     * {@code family_name + " " + given_name}, thiếu thì mới dùng {@code name}, rồi {@code preferred_username}.
     */
    static String fullName(Jwt jwt) {
        String family = jwt.getClaimAsString("family_name");
        String given = jwt.getClaimAsString("given_name");
        boolean hasFamily = family != null && !family.isBlank();
        boolean hasGiven = given != null && !given.isBlank();
        if (hasFamily && hasGiven) {
            return family.trim() + " " + given.trim();
        }
        return firstText(jwt.getClaimAsString("name"), jwt.getClaimAsString("preferred_username"));
    }

    private static String firstText(String a, String b) {
        if (a != null && !a.isBlank()) return a;
        return b != null && !b.isBlank() ? b : null;
    }
}
