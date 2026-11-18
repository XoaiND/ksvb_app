package ksvb.shared.outbox;

import java.time.LocalDate;
import java.util.UUID;
import ksvb.shared.audit.AuditService;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Propagation;
import org.springframework.transaction.annotation.Transactional;
import tools.jackson.databind.ObjectMapper;

/**
 * Ghi su kien vao ksvb_outbox trong CUNG transaction voi thay doi nghiep vu
 * (MANDATORY: bat buoc dang co transaction). Worker rieng doc bang nay va day len Kafka.
 */
@Service
public class OutboxService {


    private final OutboxRepository repo;
    private final ObjectMapper mapper;
    private final AuditService audit;

    public OutboxService(OutboxRepository repo, ObjectMapper mapper, AuditService audit) {
        this.repo = repo;
        this.mapper = mapper;
        this.audit = audit;
    }

    @Transactional(propagation = Propagation.MANDATORY)
    public void publish(String aggregateType, UUID aggregateId, String aggregateCode, String eventType,
                        Integer version, Object payload, LocalDate effectiveFrom) {
        // Jackson 3: loi serialize la JacksonException (unchecked)
        String json = mapper.writeValueAsString(payload);
        repo.save(new OutboxEvent(aggregateType, aggregateId, aggregateCode, eventType,
                version == null ? 0 : version, json, effectiveFrom));
        audit.log(eventType, aggregateType + " " + (aggregateCode != null ? aggregateCode : aggregateId),
                effectiveFrom == null ? null : "hiệu lực " + effectiveFrom);
    }
}
