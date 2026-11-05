package vn.vbi.ksvb.security;

import jakarta.servlet.FilterChain;
import jakarta.servlet.ServletException;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import java.io.IOException;
import java.util.List;
import java.util.Optional;
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;
import org.springframework.security.core.GrantedAuthority;
import org.springframework.security.core.authority.SimpleGrantedAuthority;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.web.filter.OncePerRequestFilter;
import vn.vbi.ksvb.domain.AppUser;
import vn.vbi.ksvb.domain.Permissions;
import vn.vbi.ksvb.repo.UserRepository;

/**
 * CHỈ dùng khi ksvb.security.enabled=false (dev/test): coi người có id ở header {@code X-User-Id}
 * (mặc định {@value #DEFAULT_USER}) là người đang đăng nhập, quyền suy từ app_user.role.
 */
public class DevUserFilter extends OncePerRequestFilter {

    public static final String HEADER = "X-User-Id";
    public static final long DEFAULT_USER = 4L;

    private final UserRepository users;

    public DevUserFilter(UserRepository users) {
        this.users = users;
    }

    @Override
    protected void doFilterInternal(HttpServletRequest req, HttpServletResponse res, FilterChain chain)
            throws ServletException, IOException {
        long id = DEFAULT_USER;
        String h = req.getHeader(HEADER);
        if (h != null && !h.isBlank()) {
            try {
                id = Long.parseLong(h.trim());
            } catch (NumberFormatException e) {
                res.sendError(HttpServletResponse.SC_BAD_REQUEST, "Header X-User-Id không hợp lệ");
                return;
            }
        }
        Optional<AppUser> user = users.findById(id);
        if (user.isPresent() && user.get().isActive()) {
            List<GrantedAuthority> authorities = Permissions.forDevRole(user.get().getRole()).stream()
                    .map(p -> (GrantedAuthority) new SimpleGrantedAuthority(p)).toList();
            SecurityContextHolder.getContext().setAuthentication(
                    UsernamePasswordAuthenticationToken.authenticated(user.get().getEmail(), null, authorities));
        }
        chain.doFilter(req, res);
    }
}
