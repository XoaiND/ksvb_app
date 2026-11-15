package vn.vbi.ksvb.shared.outbox;

import java.util.List;
import java.util.UUID;
import org.springframework.data.jpa.repository.JpaRepository;

public interface OutboxRepository extends JpaRepository<OutboxEvent, UUID> {

    /** Cho worker đẩy sự kiện (chưa có): các sự kiện chưa gửi, cũ nhất trước. */
    List<OutboxEvent> findTop100ByStatusOrderByOccurredAtAsc(String status);

    List<OutboxEvent> findByAggregateTypeAndAggregateIdOrderByOccurredAtAsc(String aggregateType, String aggregateId);
}
