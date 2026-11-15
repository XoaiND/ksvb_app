package vn.vbi.ksvb.shared.audit;

import java.time.LocalDateTime;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Propagation;
import org.springframework.transaction.annotation.Transactional;

@Service
public class AuditService {

    private final AuditLogRepository repo;

    public AuditService(AuditLogRepository repo) {
        this.repo = repo;
    }

    /** Ghi cùng giao dịch với thao tác nghiệp vụ (cùng thành công hoặc cùng huỷ). */
    @Transactional(propagation = Propagation.REQUIRED)
    public void log(Long actorId, String action, String target, String detail) {
        repo.save(new AuditLog(LocalDateTime.now(), actorId, action, target, detail));
    }
}
