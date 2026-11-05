package vn.vbi.ksvb.domain;

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

    protected AuditLog() {}

    public AuditLog(LocalDateTime occurredAt, Long actorId, String action, String target, String detail) {
        this.occurredAt = occurredAt;
        this.actorId = actorId;
        this.action = action;
        this.target = target;
        this.detail = detail;
    }

    public Long getId() { return id; }
    public LocalDateTime getOccurredAt() { return occurredAt; }
    public Long getActorId() { return actorId; }
    public String getAction() { return action; }
    public String getTarget() { return target; }
    public String getDetail() { return detail; }
}
