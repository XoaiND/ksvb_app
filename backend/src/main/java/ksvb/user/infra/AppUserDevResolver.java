package ksvb.user.infra;

import java.util.Optional;
import ksvb.shared.security.DevUserResolver;
import ksvb.shared.security.Permissions;
import ksvb.user.domain.AppUser;
import org.springframework.stereotype.Component;

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
    public Optional<DevUser> resolve(String userIdHeader) {
        long id;
        try {
            id = userIdHeader == null || userIdHeader.isBlank() ? DEFAULT_USER : Long.parseLong(userIdHeader.trim());
        } catch (NumberFormatException e) {
            throw new IllegalArgumentException("X-User-Id phải là số", e);
        }
        return users.findById(id)
                .filter(AppUser::isActive)
                .map(u -> new DevUser(u.getEmail(), Permissions.forDevRole(u.getRole())));
    }
}
