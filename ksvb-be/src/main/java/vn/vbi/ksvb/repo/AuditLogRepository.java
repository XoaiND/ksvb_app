package vn.vbi.ksvb.repo;

import org.springframework.data.jpa.repository.JpaRepository;
import vn.vbi.ksvb.domain.AuditLog;

public interface AuditLogRepository extends JpaRepository<AuditLog, Long> {}
