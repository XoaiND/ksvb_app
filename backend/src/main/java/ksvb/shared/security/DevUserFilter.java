package ksvb.shared.security;

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

/**
 * CHỈ dùng khi tắt bảo mật (dev/test): coi người do {@link DevUserResolver} trả về (theo header {@value #HEADER}) là
 * người đang đăng nhập. Giống hệt ở mọi app; chỉ resolver khác nhau.
 */
public class DevUserFilter extends OncePerRequestFilter {

    public static final String HEADER = "X-User-Id";

    private final DevUserResolver resolver;

    public DevUserFilter(DevUserResolver resolver) {
        this.resolver = resolver;
    }

    @Override
    protected void doFilterInternal(HttpServletRequest req, HttpServletResponse res, FilterChain chain)
            throws ServletException, IOException {
        Optional<DevUserResolver.DevUser> user;
        try {
            user = resolver.resolve(req.getHeader(HEADER));
        } catch (IllegalArgumentException e) {
            res.sendError(HttpServletResponse.SC_BAD_REQUEST, "Header " + HEADER + " không hợp lệ");
            return;
        }
        user.ifPresent(u -> {
            List<GrantedAuthority> authorities =
                    u.authorities().stream().map(a -> (GrantedAuthority) new SimpleGrantedAuthority(a)).toList();
            SecurityContextHolder.getContext()
                    .setAuthentication(UsernamePasswordAuthenticationToken.authenticated(u.username(), null, authorities));
        });
        chain.doFilter(req, res);
    }
}
