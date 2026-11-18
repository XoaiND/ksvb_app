package ksvb.shared.audit;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.GenerationType;
import jakarta.persistence.Id;
import jakarta.persistence.Table;
import java.time.OffsetDateTime;

/** Một dòng nhật ký thao tác ghi (bảng {@code audit_log}). */
@Entity
@Table(name = "audit_log")
public class AuditLog {

    public static final String OK = "OK";
    public static final String ERROR = "ERROR";

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(name = "occurred_at", nullable = false)
    private OffsetDateTime occurredAt;

    /** Tên đăng nhập của người thao tác ({@link AuditService#currentActor()}). */
    @Column(length = 100)
    private String actor;

    @Column(nullable = false, length = 60)
    private String action;

    @Column(length = 120)
    private String target;

    @Column(length = 500)
    private String detail;

    /** {@link #OK} hoặc {@link #ERROR} (thao tác bị chặn/thất bại). */
    @Column(nullable = false, length = 10)
    private String result;

    protected AuditLog() {}

    public AuditLog(OffsetDateTime occurredAt, String actor, String action, String target, String detail, String result) {
        this.occurredAt = occurredAt;
        this.actor = cut(actor, 100);
        this.action = cut(action, 60);
        this.target = cut(target, 120);
        this.detail = cut(detail, 500);
        this.result = result;
    }

    private static String cut(String s, int max) {
        return s == null || s.length() <= max ? s : s.substring(0, max - 1) + "…";
    }

    public Long getId() { return id; }
    public OffsetDateTime getOccurredAt() { return occurredAt; }
    public String getActor() { return actor; }
    public String getAction() { return action; }
    public String getTarget() { return target; }
    public String getDetail() { return detail; }
    public String getResult() { return result; }
}
