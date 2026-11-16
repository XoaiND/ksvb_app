package vn.vbi.ksvb.shared.security;

import jakarta.servlet.FilterChain;
import jakarta.servlet.ServletException;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import java.io.IOException;
import org.springframework.security.core.Authentication;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.web.filter.OncePerRequestFilter;

/**
 * CHỈ dùng khi security.enabled=false (dev/test): coi người xác định bởi {@link DevUserResolver} từ header
 * {@value #HEADER} là người đang đăng nhập.
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
        try {
            resolver.resolve(req.getHeader(HEADER)).ifPresent(DevUserFilter::authenticate);
        } catch (IllegalArgumentException e) {
            res.sendError(HttpServletResponse.SC_BAD_REQUEST, "Header " + HEADER + " không hợp lệ");
            return;
        }
        chain.doFilter(req, res);
    }

    private static void authenticate(Authentication auth) {
        SecurityContextHolder.getContext().setAuthentication(auth);
    }
}
