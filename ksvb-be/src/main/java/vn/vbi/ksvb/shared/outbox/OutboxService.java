package vn.vbi.ksvb.shared.outbox;

import java.time.LocalDateTime;
import java.util.Map;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Propagation;
import org.springframework.transaction.annotation.Transactional;
import tools.jackson.databind.ObjectMapper;

/**
 * Ghi sự kiện vào {@code ksvb_outbox} trong CÙNG transaction với thay đổi nghiệp vụ (ECOSYSTEM.md 12.2): nghiệp vụ
 * huỷ thì sự kiện cũng huỷ. Worker đẩy sự kiện đi (Kafka/HTTP) làm sau, đọc các dòng {@code status = NEW}.
 */
@Service
public class OutboxService {

    private final OutboxRepository repo;
    private final ObjectMapper json;

    public OutboxService(OutboxRepository repo, ObjectMapper json) {
        this.repo = repo;
        this.json = json;
    }

    /** Bắt buộc gọi trong transaction đang mở (MANDATORY): không có thì báo lỗi thay vì ghi lẻ. */
    @Transactional(propagation = Propagation.MANDATORY)
    public OutboxEvent publish(String aggregateType, Object aggregateId, String aggregateCode, String eventType,
                               Map<String, ?> payload) {
        return repo.save(new OutboxEvent(aggregateType, String.valueOf(aggregateId), aggregateCode, eventType,
                json.writeValueAsString(payload), LocalDateTime.now()));
    }
}
