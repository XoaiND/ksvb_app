package vn.vbi.ksvb.signrequest.infra;

import java.time.LocalDate;
import java.util.Map;
import org.springframework.stereotype.Component;
import vn.vbi.ksvb.signrequest.domain.DocCounter;

/**
 * Cấp số hiệu văn bản dạng {@code HD-2026-0143} từ bảng {@code doc_counter}: khoá ghi bộ đếm để hai lần cấp đồng thời
 * không trùng số (số do DB cấp, không sinh ở code). Gọi trong transaction đang mở.
 */
@Component
public class DocNumberGenerator {

    private static final Map<String, String> CODE_PREFIX = Map.of(
            "Hợp đồng", "HD", "Quyết định", "QD", "Tờ trình", "TT",
            "Báo giá", "BG", "Biên bản", "BB", "Công văn", "CV");

    private final DocCounterRepository counters;

    public DocNumberGenerator(DocCounterRepository counters) {
        this.counters = counters;
    }

    public String next(String docType, LocalDate today) {
        String prefix = CODE_PREFIX.getOrDefault(docType, "VB");
        String key = prefix + "-" + today.getYear();
        DocCounter c = counters.findForUpdate(key).orElseGet(() -> counters.saveAndFlush(new DocCounter(key)));
        int n = c.next();
        counters.save(c);
        return String.format("%s-%04d", key, n);
    }
}
