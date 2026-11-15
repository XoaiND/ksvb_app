package vn.vbi.ksvb.signrequest.application;

import static org.assertj.core.api.Assertions.assertThat;

import java.time.LocalDate;
import java.util.ArrayList;
import java.util.HashSet;
import java.util.List;
import java.util.Map;
import java.util.concurrent.Callable;
import java.util.concurrent.ExecutorService;
import java.util.concurrent.Executors;
import java.util.concurrent.Future;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.boot.testcontainers.service.connection.ServiceConnection;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.test.context.ActiveProfiles;
import org.springframework.transaction.support.TransactionTemplate;
import org.testcontainers.junit.jupiter.Container;
import org.testcontainers.junit.jupiter.Testcontainers;
import org.testcontainers.postgresql.PostgreSQLContainer;
import vn.vbi.ksvb.shared.outbox.OutboxEvent;
import vn.vbi.ksvb.shared.outbox.OutboxRepository;
import vn.vbi.ksvb.shared.outbox.OutboxService;
import vn.vbi.ksvb.signrequest.domain.DocStatus;
import vn.vbi.ksvb.signrequest.domain.Priority;
import vn.vbi.ksvb.signrequest.domain.SignMode;
import vn.vbi.ksvb.user.infra.UserRepository;

/**
 * Chạy trên PostgreSQL thật (Testcontainers, cần Docker) với schema mặc định {@code ksvb} như môi trường thật:
 * Flyway áp migration + Hibernate {@code validate}, truy vấn Specification (lower/like tiếng Việt, join, member of)
 * và khoá ghi {@code doc_counter} khi nhiều transaction cùng sinh số hiệu.
 */
@SpringBootTest(properties = {
        "spring.jpa.properties.hibernate.default_schema=ksvb",
        "spring.flyway.schemas=ksvb",
        "spring.flyway.default-schema=ksvb"
})
@ActiveProfiles("test")
@Testcontainers
class PostgresIntegrationTest {

    @Container
    @ServiceConnection
    static PostgreSQLContainer postgres = new PostgreSQLContainer("postgres:17-alpine");

    @Autowired JdbcTemplate jdbc;
    @Autowired SignRequestService service;
    @Autowired UserRepository users;
    @Autowired TransactionTemplate tx;
    @Autowired OutboxRepository outbox;
    @Autowired OutboxService outboxService;

    @Test
    void flywayTaoBangTrongSchemaKsvb() {
        Integer ok = jdbc.queryForObject(
                "select count(*) from ksvb.flyway_schema_history where success", Integer.class);
        assertThat(ok).isPositive();
        Integer tables = jdbc.queryForObject(
                "select count(*) from information_schema.tables where table_schema = 'ksvb' and table_name = 'sign_request'",
                Integer.class);
        assertThat(tables).isEqualTo(1);
    }

    @Test
    void timKiemTheoTuKhoaTiengVietKhongPhanBietHoaThuong() {
        var me = users.findById(4L).orElseThrow();
        var page = service.search(me, "mine", "HỢP ĐỒNG CUNG", null, null, null, 0, 10);
        assertThat(page.content()).extracting(SignRequestSummary::title)
                .containsExactly("Hợp đồng cung cấp dịch vụ ABC-01");

        var drafts = service.search(me, "mine", null, null, null, DocStatus.DRAFT, 0, 10);
        assertThat(drafts.totalElements()).isEqualTo(1);

        var pending = service.search(me, "pending", null, null, null, null, 0, 10);
        assertThat(pending.totalElements()).isEqualTo(2);
        assertThat(pending.page()).isZero();
        assertThat(pending.size()).isEqualTo(10);

        var watching = service.search(users.findById(5L).orElseThrow(), "watching", null, null, null, null, 0, 10);
        assertThat(watching.totalElements()).isPositive();
    }

    @Test
    void trinhVaKy_ghiOutboxCungTransaction_vaNhatKy() {
        var creator = users.findById(4L).orElseThrow();
        var signer = users.findById(1L).orElseThrow();
        long id = tx.execute(s -> {
            var d = service.create(creator, new SaveSignRequest("Công văn thử outbox", "Công văn", null, Priority.NORMAL, SignMode.SEQ,
                    LocalDate.now().plusDays(5), null, false, List.of(1L), List.of()));
            return d.id();
        });
        jdbc.update("insert into ksvb.attachment (request_id, original_name, stored_name, size_bytes, signable, uploaded_at)"
                + " values (?, 'a.pdf', 'x.pdf', 10, true, now())", id);
        service.submit(creator, id);
        service.sign(signer, id, null);

        List<String> types = outbox.findByAggregateTypeAndAggregateIdOrderByOccurredAtAsc(
                SignRequestEvents.AGGREGATE, String.valueOf(id)).stream().map(OutboxEvent::getEventType).toList();
        assertThat(types).containsExactly(SignRequestEvents.SUBMITTED, SignRequestEvents.SIGNED,
                SignRequestEvents.COMPLETED);
        var first = outbox.findByAggregateTypeAndAggregateIdOrderByOccurredAtAsc(SignRequestEvents.AGGREGATE,
                String.valueOf(id)).get(0);
        assertThat(first.getStatus()).isEqualTo("NEW");
        assertThat(first.getAggregateCode()).startsWith("CV-");
        assertThat(first.getPayload()).contains("\"status\":\"PENDING\"");

        // ký lại khi đã hoàn thành → lỗi, transaction huỷ: không thêm sự kiện
        org.assertj.core.api.Assertions.assertThatThrownBy(() -> service.sign(signer, id, null));
        assertThat(outbox.findByAggregateTypeAndAggregateIdOrderByOccurredAtAsc(SignRequestEvents.AGGREGATE,
                String.valueOf(id))).hasSize(3);
    }

    @Test
    void outboxBatBuocCoTransaction() {
        org.assertj.core.api.Assertions.assertThatThrownBy(() -> outboxService.publish("X", 1, null, "Y", Map.of()))
                .isInstanceOf(org.springframework.transaction.IllegalTransactionStateException.class);
    }

    @Test
    void sinhSoHieuDongThoiKhongTrung() throws Exception {
        LocalDate day = LocalDate.of(2031, 1, 1);
        int n = 8;
        // tạo sẵn bộ đếm: lần tạo đầu tiên (chưa có dòng để khoá) không thuộc phạm vi test này
        String first = tx.execute(s -> service.nextCode("Công văn", day));
        ExecutorService pool = Executors.newFixedThreadPool(n);
        try {
            List<Callable<String>> jobs = new ArrayList<>();
            for (int i = 0; i < n; i++) {
                jobs.add(() -> tx.execute(s -> service.nextCode("Công văn", day)));
            }
            List<String> codes = new ArrayList<>();
            for (Future<String> f : pool.invokeAll(jobs)) {
                codes.add(f.get());
            }
            codes.add(first);
            assertThat(new HashSet<>(codes)).hasSize(n + 1);
            assertThat(codes).allMatch(c -> c.startsWith("CV-2031-"));
        } finally {
            pool.shutdownNow();
        }
    }
}
