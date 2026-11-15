package vn.vbi.ksvb.shared.outbox;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.Id;
import jakarta.persistence.Table;
import java.time.LocalDateTime;
import java.util.UUID;

/** Một sự kiện trong bảng {@code ksvb_outbox} (cùng dạng {@code hrm_outbox}); ghi cùng transaction với nghiệp vụ. */
@Entity
@Table(name = "ksvb_outbox")
public class OutboxEvent {

    public static final String NEW = "NEW";

    @Id
    @Column(name = "event_id")
    private UUID eventId;

    @Column(name = "aggregate_type", nullable = false, length = 30)
    private String aggregateType;

    @Column(name = "aggregate_id", nullable = false, length = 64)
    private String aggregateId;

    @Column(name = "aggregate_code", length = 30)
    private String aggregateCode;

    @Column(name = "event_type", nullable = false, length = 50)
    private String eventType;

    @Column(nullable = false, length = 4000)
    private String payload;

    @Column(name = "occurred_at", nullable = false)
    private LocalDateTime occurredAt;

    @Column(nullable = false, length = 10)
    private String status;

    @Column(name = "retry_count", nullable = false)
    private int retryCount;

    @Column(name = "sent_at")
    private LocalDateTime sentAt;

    @Column(name = "last_error", length = 1000)
    private String lastError;

    protected OutboxEvent() {}

    public OutboxEvent(String aggregateType, String aggregateId, String aggregateCode, String eventType, String payload,
                       LocalDateTime occurredAt) {
        this.eventId = UUID.randomUUID();
        this.aggregateType = aggregateType;
        this.aggregateId = aggregateId;
        this.aggregateCode = aggregateCode;
        this.eventType = eventType;
        this.payload = payload;
        this.occurredAt = occurredAt;
        this.status = NEW;
    }

    public UUID getEventId() { return eventId; }
    public String getAggregateType() { return aggregateType; }
    public String getAggregateId() { return aggregateId; }
    public String getAggregateCode() { return aggregateCode; }
    public String getEventType() { return eventType; }
    public String getPayload() { return payload; }
    public LocalDateTime getOccurredAt() { return occurredAt; }
    public String getStatus() { return status; }
    public int getRetryCount() { return retryCount; }
    public LocalDateTime getSentAt() { return sentAt; }
    public String getLastError() { return lastError; }
}
