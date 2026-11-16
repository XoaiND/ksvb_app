package vn.vbi.ksvb.shared.error;

import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import java.io.IOException;
import java.nio.charset.StandardCharsets;

/**
 * 401/403 sinh ở tầng filter của Spring Security (ngoài {@link GlobalExceptionHandler}): vẫn trả RFC 7807 với {@code code}
 * theo bộ mã chuẩn. Dùng trong SecurityConfig: {@code authenticationEntryPoint(ProblemResponses::unauthorized)},
 * {@code accessDeniedHandler(ProblemResponses::forbidden)}.
 */
public final class ProblemResponses {

    private ProblemResponses() {
    }

    public static void unauthorized(HttpServletRequest req, HttpServletResponse res, Exception e) throws IOException {
        write(res, 401, "Unauthorized", ApiErrorCode.UNAUTHORIZED, "Chưa đăng nhập hoặc phiên đăng nhập đã hết hạn", req);
    }

    public static void forbidden(HttpServletRequest req, HttpServletResponse res, Exception e) throws IOException {
        write(res, 403, "Forbidden", ApiErrorCode.FORBIDDEN, "Không có quyền thực hiện", req);
    }

    private static void write(HttpServletResponse res, int status, String title, String code, String detail,
                              HttpServletRequest req) throws IOException {
        if (res.isCommitted()) return;
        res.setStatus(status);
        if (status == 401) res.setHeader("WWW-Authenticate", "Bearer");
        res.setContentType("application/problem+json");
        res.setCharacterEncoding(StandardCharsets.UTF_8.name());
        res.getWriter().write("{\"type\":\"about:blank\",\"title\":\"" + title + "\",\"status\":" + status
                + ",\"detail\":\"" + detail + "\",\"instance\":\"" + escape(req.getRequestURI())
                + "\",\"code\":\"" + code + "\"}");
    }

    private static String escape(String s) {
        return s == null ? "" : s.replace("\\", "\\\\").replace("\"", "\\\"");
    }
}
