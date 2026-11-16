package vn.vbi.ksvb.shared.error;

import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import java.io.IOException;
import java.nio.charset.StandardCharsets;
import org.springframework.http.HttpStatus;
import org.springframework.http.MediaType;
import org.springframework.security.oauth2.server.resource.web.BearerTokenAuthenticationEntryPoint;
import org.springframework.security.oauth2.server.resource.web.access.BearerTokenAccessDeniedHandler;
import org.springframework.security.web.AuthenticationEntryPoint;
import org.springframework.security.web.access.AccessDeniedHandler;

/**
 * 401/403 sinh ở tầng filter (trước khi tới controller) cũng trả RFC 7807 có {@code code}, như lỗi từ controller.
 * Giữ header {@code WWW-Authenticate} của chuẩn Bearer bằng cách gọi bộ xử lý mặc định trước.
 */
public final class ProblemResponses {

    private ProblemResponses() {
    }

    public static AuthenticationEntryPoint entryPoint() {
        BearerTokenAuthenticationEntryPoint bearer = new BearerTokenAuthenticationEntryPoint();
        return (req, res, ex) -> {
            bearer.commence(req, res, ex);
            write(req, res, HttpStatus.UNAUTHORIZED,
                    "Phiên đăng nhập đã hết hạn hoặc chưa đăng nhập. Vui lòng đăng nhập lại.");
        };
    }

    public static AccessDeniedHandler accessDenied() {
        BearerTokenAccessDeniedHandler bearer = new BearerTokenAccessDeniedHandler();
        return (req, res, ex) -> {
            bearer.handle(req, res, ex);
            write(req, res, HttpStatus.FORBIDDEN, "Bạn không có quyền thực hiện thao tác này.");
        };
    }

    /** {@code code} theo HTTP: 401 = {@code UNAUTHORIZED}, 403 = {@code FORBIDDEN} (docs/kien-truc-chuan.md mục 3.1). */
    static void write(HttpServletRequest req, HttpServletResponse res, HttpStatus status, String detail)
            throws IOException {
        if (res.isCommitted()) {
            return;
        }
        res.setStatus(status.value());
        res.setContentType(MediaType.APPLICATION_PROBLEM_JSON_VALUE);
        res.setCharacterEncoding(StandardCharsets.UTF_8.name());
        res.getWriter().write("{\"type\":\"about:blank\",\"title\":\"" + status.getReasonPhrase()
                + "\",\"status\":" + status.value() + ",\"detail\":\"" + detail + "\",\"instance\":\""
                + escape(req.getRequestURI()) + "\",\"code\":\"" + ApiErrorCode.fromStatus(status.value()) + "\"}");
    }

    private static String escape(String s) {
        return s == null ? "" : s.replace("\\", "\\\\").replace("\"", "\\\"");
    }
}
