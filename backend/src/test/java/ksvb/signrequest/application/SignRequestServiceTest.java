package ksvb.signrequest.application;

import static org.assertj.core.api.Assertions.assertThat;

import java.nio.file.Files;
import java.nio.file.Path;
import java.time.LocalDate;
import java.util.ArrayList;
import java.util.HashSet;
import java.util.List;
import java.util.Map;
import java.util.UUID;
import java.util.concurrent.Callable;
import java.util.concurrent.ExecutorService;
import java.util.concurrent.Executors;
import java.util.concurrent.Future;
import ksvb.PostgresIntegrationTest;
import ksvb.config.KsvbProperties;
import ksvb.shared.outbox.OutboxRepository;
import ksvb.shared.outbox.OutboxService;
import ksvb.signrequest.domain.DocStatus;
import ksvb.signrequest.domain.Priority;
import ksvb.signrequest.domain.SignMode;
import ksvb.signrequest.infra.PdfSignatureSlots;
import ksvb.user.infra.UserRepository;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.transaction.support.TransactionTemplate;

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
class SignRequestServiceTest extends PostgresIntegrationTest {

    @Autowired PdfSignatureSlots pdf;
    @Autowired KsvbProperties props;


    @Autowired JdbcTemplate jdbc;
    @Autowired SignRequestService service;
    @Autowired ksvb.signrequest.infra.DocNumberGenerator numbers;
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
                    LocalDate.now().plusDays(5), null, false, List.of(1L), null, List.of(), null));
            return d.id();
        });
        String stored = UUID.randomUUID() + ".pdf";
        try {
            Path dir = Path.of(props.storage().path()).toAbsolutePath().normalize();
            Files.createDirectories(dir);
            Files.write(dir.resolve(stored), pdf.samplePdf("Cong van", 1)); // có sẵn ô ký số 1
        } catch (java.io.IOException e) {
            throw new IllegalStateException(e);
        }
        jdbc.update("insert into ksvb.attachment (request_id, original_name, stored_name, size_bytes, signable, uploaded_at)"
                + " values (?, 'a.pdf', ?, 10, true, now())", id, stored);
        service.submit(creator, id);
        service.sign(signer, id, null, true);

        String agg = new UUID(0L, id).toString();
        List<String> types = jdbc.queryForList("select event_type from ksvb.ksvb_outbox where aggregate_type = ?"
                + " and aggregate_id = ?::uuid order by occurred_at, event_id", String.class, SignRequestEvents.AGGREGATE, agg);
        assertThat(types).containsExactly(SignRequestEvents.SUBMITTED, SignRequestEvents.SIGNED,
                SignRequestEvents.COMPLETED);
        var first = jdbc.queryForMap("select status, aggregate_code, payload::text as payload from ksvb.ksvb_outbox"
                + " where aggregate_type = ? and aggregate_id = ?::uuid order by occurred_at, event_id limit 1",
                SignRequestEvents.AGGREGATE, agg);
        assertThat(first.get("status")).isEqualTo("NEW");
        assertThat((String) first.get("aggregate_code")).startsWith("CV-");
        assertThat((String) first.get("payload")).contains("\"status\": \"PENDING\"");

        // cột audit chung (V3): trigger cập nhật updated_at, version_no tăng mỗi lần sửa; created_by ghi người tạo
        var audit = jdbc.queryForMap("select version_no, created_by, created_at, updated_at from ksvb.sign_request where id = ?", id);
        assertThat((Integer) audit.get("version_no")).isGreaterThanOrEqualTo(2);
        assertThat(audit.get("created_by")).isEqualTo("SYSTEM"); // gọi service ngoài request: không có người đăng nhập
        assertThat(audit.get("created_at")).isNotNull();
        assertThat(audit.get("updated_at")).isNotNull();

        // ký lại khi đã hoàn thành → lỗi, transaction huỷ: không thêm sự kiện
        org.assertj.core.api.Assertions.assertThatThrownBy(() -> service.sign(signer, id, null, true));
        assertThat(jdbc.queryForObject("select count(*) from ksvb.ksvb_outbox where aggregate_type = ? and aggregate_id = ?::uuid", Integer.class,
                SignRequestEvents.AGGREGATE, new UUID(0L, id).toString())).isEqualTo(3);
    }

    @Test
    void suaVanBan_versionNoLech_tra409() {
        var creator = users.findById(6L).orElseThrow();
        var d = tx.execute(s -> service.create(creator, new SaveSignRequest("Bản nháp khoá lạc quan", "Hợp đồng", null,
                Priority.NORMAL, SignMode.SEQ, null, null, false, List.of(1L), null, List.of(), null)));
        var edit = new SaveSignRequest("Sửa lần 1", "Hợp đồng", null, Priority.NORMAL, SignMode.SEQ, null, null, false,
                List.of(1L), null, List.of(), d.versionNo());
        var saved = service.update(creator, d.id(), edit);
        assertThat(saved.versionNo()).isGreaterThan(d.versionNo());
        // gửi lại versionNo cũ (người khác vừa sửa) → 409
        org.assertj.core.api.Assertions.assertThatThrownBy(() -> service.update(creator, d.id(), edit))
                .isInstanceOf(ksvb.shared.error.ConflictException.class);
    }

    @Test
    void outboxBatBuocCoTransaction() {
        org.assertj.core.api.Assertions.assertThatThrownBy(() -> outboxService.publish("X", new UUID(0L, 1L), null, "Y", 0, Map.of(), null))
                .isInstanceOf(org.springframework.transaction.IllegalTransactionStateException.class);
    }

    @Test
    void sinhSoHieuDongThoiKhongTrung() throws Exception {
        LocalDate day = LocalDate.of(2031, 1, 1);
        int n = 8;
        // tạo sẵn bộ đếm: lần tạo đầu tiên (chưa có dòng để khoá) không thuộc phạm vi test này
        String first = tx.execute(s -> numbers.next("Công văn", day));
        ExecutorService pool = Executors.newFixedThreadPool(n);
        try {
            List<Callable<String>> jobs = new ArrayList<>();
            for (int i = 0; i < n; i++) {
                jobs.add(() -> tx.execute(s -> numbers.next("Công văn", day)));
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
