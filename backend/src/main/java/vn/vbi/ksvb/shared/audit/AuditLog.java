package vn.vbi.ksvb.shared.audit;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.GenerationType;
import jakarta.persistence.Id;
import jakarta.persistence.Table;
import java.time.LocalDateTime;

/** Nhật ký thao tác (ký, từ chối, huỷ, phân quyền...). */
@Entity
@Table(name = "audit_log")
public class AuditLog {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(name = "occurred_at", nullable = false)
    private LocalDateTime occurredAt;

    @Column(name = "actor_id")
    private Long actorId;

    @Column(nullable = false, length = 60)
    private String action;

    @Column(length = 120)
    private String target;

    @Column(length = 500)
    private String detail;

    /** {@link #OK} hoặc {@link #ERROR} (thao tác bị chặn/thất bại). */
    @Column(nullable = false, length = 10)
    private String result;

    public static final String OK = "OK";
    public static final String ERROR = "ERROR";

    protected AuditLog() {}

    public AuditLog(LocalDateTime occurredAt, Long actorId, String action, String target, String detail) {
        this(occurredAt, actorId, action, target, detail, OK);
    }

    public AuditLog(LocalDateTime occurredAt, Long actorId, String action, String target, String detail, String result) {
        this.occurredAt = occurredAt;
        this.actorId = actorId;
        this.action = cut(action, 60);
        this.target = cut(target, 120);
        this.detail = cut(detail, 500);
        this.result = result;
    }

    private static String cut(String s, int max) {
        return s == null || s.length() <= max ? s : s.substring(0, max - 1) + "…";
    }

    public Long getId() { return id; }
    public LocalDateTime getOccurredAt() { return occurredAt; }
    public Long getActorId() { return actorId; }
    public String getAction() { return action; }
    public String getTarget() { return target; }
    public String getDetail() { return detail; }
    public String getResult() { return result; }
}
