package vn.vbi.ksvb.shared.audit;

import java.time.LocalDateTime;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Propagation;
import org.springframework.transaction.annotation.Transactional;

/**
 * Nhật ký thao tác ghi (ECOSYSTEM.md 12.2): ai, lúc nào, đối tượng, kết quả. Không ghi secret (token, mật khẩu, nội dung
 * tệp).
 */
@Service
public class AuditService {

    private final AuditLogRepository repo;

    public AuditService(AuditLogRepository repo) {
        this.repo = repo;
    }

    /** Thao tác thành công: ghi cùng giao dịch với thao tác nghiệp vụ (cùng thành công hoặc cùng huỷ). */
    @Transactional(propagation = Propagation.REQUIRED)
    public void log(Long actorId, String action, String target, String detail) {
        repo.save(new AuditLog(LocalDateTime.now(), actorId, action, target, detail, AuditLog.OK));
    }

    /**
     * Thao tác bị chặn/thất bại ({@code result = ERROR}): ghi trong transaction RIÊNG vì transaction nghiệp vụ đã bị
     * huỷ, để vẫn còn dấu vết.
     */
    @Transactional(propagation = Propagation.REQUIRES_NEW)
    public void logBlocked(Long actorId, String action, String target, String detail) {
        repo.save(new AuditLog(LocalDateTime.now(), actorId, action, target, detail, AuditLog.ERROR));
    }
}
