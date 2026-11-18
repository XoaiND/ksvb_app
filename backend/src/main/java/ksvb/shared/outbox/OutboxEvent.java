package ksvb.shared.outbox;

import jakarta.persistence.*;
import java.time.LocalDate;
import java.time.OffsetDateTime;
import java.util.UUID;
import org.hibernate.annotations.ColumnTransformer;

/** Sự kiện chờ đẩy ra ngoài (bảng outbox của app, ghi cùng transaction với thay đổi nghiệp vụ). */
@Entity
@Table(name = "ksvb_outbox")
public class OutboxEvent {

    @Id
    @Column(name = "event_id", nullable = false, updatable = false)
    private UUID eventId = UUID.randomUUID();

    @Column(name = "aggregate_type", nullable = false, length = 30)
    private String aggregateType;

    @Column(name = "aggregate_id", nullable = false)
    private UUID aggregateId;

    @Column(name = "aggregate_code", length = 30)
    private String aggregateCode;

    @Column(name = "event_type", nullable = false, length = 50)
    private String eventType;

    @Column(name = "aggregate_ver", nullable = false)
    private int aggregateVer;

    /** Chuỗi JSON, ép kiểu sang jsonb khi ghi (không phụ thuộc FormatMapper JSON của Hibernate). */
    @ColumnTransformer(write = "?::jsonb")
    @Column(name = "payload", nullable = false, columnDefinition = "jsonb")
    private String payload;

    @Column(name = "occurred_at", nullable = false)
    private OffsetDateTime occurredAt = OffsetDateTime.now();

    @Column(name = "effective_from")
    private LocalDate effectiveFrom;

    @Column(name = "status", nullable = false, length = 10)
    private String status = "NEW";

    @Column(name = "retry_count", nullable = false)
    private int retryCount;

    protected OutboxEvent() {}

    public OutboxEvent(String aggregateType, UUID aggregateId, String aggregateCode, String eventType,
                       int aggregateVer, String payload, LocalDate effectiveFrom) {
        this.aggregateType = aggregateType;
        this.aggregateId = aggregateId;
        this.aggregateCode = aggregateCode;
        this.eventType = eventType;
        this.aggregateVer = aggregateVer;
        this.payload = payload;
        this.effectiveFrom = effectiveFrom;
    }

    public UUID getEventId() { return eventId; }
    public String getEventType() { return eventType; }
}
