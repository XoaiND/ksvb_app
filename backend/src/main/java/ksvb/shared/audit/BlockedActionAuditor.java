package ksvb.shared.audit;

import jakarta.servlet.http.HttpServletRequest;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.stereotype.Component;

/**
 * Ghi nhật ký {@code result = ERROR} cho thao tác GHI bị chặn (thiếu quyền, sai trạng thái, vi phạm luật nghiệp vụ).
 * Gọi từ bộ xử lý lỗi chung; lỗi khi ghi nhật ký không được làm hỏng phản hồi lỗi gốc.
 */
@Component
public class BlockedActionAuditor {

    public static final String ACTION = "BLOCKED";
    private static final Logger log = LoggerFactory.getLogger(BlockedActionAuditor.class);

    private final AuditService audit;

    public BlockedActionAuditor(AuditService audit) {
        this.audit = audit;
    }

    public void record(HttpServletRequest req, String code, String message) {
        if (req == null || !isWrite(req.getMethod()) || !req.getRequestURI().startsWith("/api/")) return;
        try {
            audit.logBlocked(ACTION, req.getMethod() + " " + req.getRequestURI(), code + ": " + message);
        } catch (RuntimeException e) {
            log.warn("Không ghi được nhật ký thao tác bị chặn: {}", e.getMessage());
        }
    }

    private static boolean isWrite(String method) {
        return "POST".equals(method) || "PUT".equals(method) || "PATCH".equals(method) || "DELETE".equals(method);
    }
}
