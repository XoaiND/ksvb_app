package vn.vbi.ksvb.user.infra;

import java.util.List;
import java.util.Optional;
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;
import org.springframework.security.core.Authentication;
import org.springframework.security.core.GrantedAuthority;
import org.springframework.security.core.authority.SimpleGrantedAuthority;
import org.springframework.stereotype.Component;
import vn.vbi.ksvb.shared.security.DevUserResolver;
import vn.vbi.ksvb.shared.security.Permissions;
import vn.vbi.ksvb.user.domain.AppUser;

/**
 * Chế độ dev của KSVB: người dùng là bản ghi {@code app_user} có id ở header {@code X-User-Id} (mặc định
 * {@value #DEFAULT_USER}), quyền suy từ cột {@code app_user.role} (xem {@link Permissions#forDevRole}).
 */
@Component
public class AppUserDevResolver implements DevUserResolver {

    public static final long DEFAULT_USER = 4L;

    private final UserRepository users;

    public AppUserDevResolver(UserRepository users) {
        this.users = users;
    }

    @Override
    public Optional<Authentication> resolve(String userId) {
        long id = userId == null || userId.isBlank() ? DEFAULT_USER : Long.parseLong(userId.trim());
        return users.findById(id).filter(AppUser::isActive).map(u -> {
            List<GrantedAuthority> authorities = Permissions.forDevRole(u.getRole()).stream()
                    .map(p -> (GrantedAuthority) new SimpleGrantedAuthority(p)).toList();
            return UsernamePasswordAuthenticationToken.authenticated(u.getEmail(), null, authorities);
        });
    }
}
