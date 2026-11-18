package ksvb.shared.outbox;

import java.util.UUID;
import org.springframework.data.jpa.repository.JpaRepository;

/** Ghi sự kiện outbox. Truy vấn riêng của tính năng (màn Đồng bộ, worker) đặt ở {@code <feature>/infra}. */
public interface OutboxRepository extends JpaRepository<OutboxEvent, UUID> {}
