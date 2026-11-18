package ksvb.shared.audit;

import java.time.OffsetDateTime;
import org.springframework.security.core.Authentication;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Propagation;
import org.springframework.transaction.annotation.Transactional;

/**
 * Nhật ký thao tác ghi (docs/kien-truc-chuan.md 3.1): ai, lúc nào, đối tượng, kết quả. Không ghi secret.
 * Người thao tác = tên đăng nhập trong token (hoặc {@code SYSTEM} khi chạy nền).
 */
@Service
public class AuditService {

    public static final String SYSTEM = "SYSTEM";

    private final AuditLogRepository repo;

    public AuditService(AuditLogRepository repo) {
        this.repo = repo;
    }

    /** Tên đăng nhập của người đang thao tác (tối đa 50 ký tự), {@code SYSTEM} nếu không có. */
    public static String currentActor() {
        Authentication a = SecurityContextHolder.getContext().getAuthentication();
        if (a == null || a.getName() == null || a.getName().isBlank()) return SYSTEM;
        String n = a.getName();
        return n.length() > 50 ? n.substring(0, 50) : n;
    }

    /** Thao tác thành công: ghi cùng giao dịch với thao tác nghiệp vụ (cùng thành công hoặc cùng huỷ). */
    @Transactional(propagation = Propagation.REQUIRED)
    public void log(String action, String target, String detail) {
        repo.save(new AuditLog(OffsetDateTime.now(), currentActor(), action, target, detail, AuditLog.OK));
    }

    /**
     * Thao tác bị chặn/thất bại ({@code result = ERROR}): ghi trong transaction RIÊNG vì transaction nghiệp vụ đã bị
     * huỷ, để vẫn còn dấu vết.
     */
    @Transactional(propagation = Propagation.REQUIRES_NEW)
    public void logBlocked(String action, String target, String detail) {
        repo.save(new AuditLog(OffsetDateTime.now(), currentActor(), action, target, detail, AuditLog.ERROR));
    }
}
