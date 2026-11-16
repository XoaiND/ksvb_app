package vn.vbi.ksvb.shared.error;

import static org.assertj.core.api.Assertions.assertThat;

import java.util.Map;
import org.junit.jupiter.api.Test;
import org.springframework.http.ProblemDetail;
import org.springframework.mock.web.MockHttpServletRequest;
import org.springframework.security.access.AccessDeniedException;
import vn.vbi.ksvb.shared.audit.BlockedActionAuditor;

/** Định dạng ProblemDetail chuẩn (docs/kien-truc-chuan.md mục 3.1): {@code code} theo bộ mã, {@code reason} khi có. */
class GlobalExceptionHandlerTest {

    private final GlobalExceptionHandler handler = new GlobalExceptionHandler(new BlockedActionAuditor(null, null) {
        @Override
        public void record(jakarta.servlet.http.HttpServletRequest req, String code, String message) {
        }
    });
    private final MockHttpServletRequest post = new MockHttpServletRequest("POST", "/api/sign-requests/1/submit");

    @Test
    void luatNghiepVu_422_businessRule_kemReason() {
        ProblemDetail p = handler.business(new BusinessException("NO_SIGNER", "Cần ít nhất một người ký"), post);
        assertThat(p.getStatus()).isEqualTo(422);
        assertThat(p.getProperties()).containsEntry("code", "BUSINESS_RULE").containsEntry("reason", "NO_SIGNER");
        assertThat(p.getDetail()).isEqualTo("Cần ít nhất một người ký");
    }

    @Test
    void xungDot_409_kemThuocTinh() {
        ProblemDetail p = handler.conflict(new ConflictException("NOT_YOUR_TURN", "Chưa đến lượt", Map.of("orderNo", 2)),
                post);
        assertThat(p.getStatus()).isEqualTo(409);
        assertThat(p.getProperties()).containsEntry("code", "CONFLICT").containsEntry("reason", "NOT_YOUR_TURN")
                .containsEntry("orderNo", 2);
    }

    @Test
    void khongTimThay_404_khongCoReason() {
        ProblemDetail p = handler.notFound(new NotFoundException("Văn bản", 9));
        assertThat(p.getStatus()).isEqualTo(404);
        assertThat(p.getProperties()).containsEntry("code", "NOT_FOUND").doesNotContainKey("reason");
        assertThat(p.getDetail()).isEqualTo("Văn bản không tồn tại: 9");
    }

    @Test
    void thieuQuyen_403_giuThongDiepTiengViet() {
        ProblemDetail p = handler.denied(new AccessDeniedException("Chỉ người tạo mới được nhắc ký"), post);
        assertThat(p.getStatus()).isEqualTo(403);
        assertThat(p.getProperties()).containsEntry("code", "FORBIDDEN");
        assertThat(p.getDetail()).isEqualTo("Chỉ người tạo mới được nhắc ký");
    }

    @Test
    void maChuanSuyTuHttp() {
        assertThat(ApiErrorCode.fromStatus(400)).isEqualTo("VALIDATION_ERROR");
        assertThat(ApiErrorCode.fromStatus(401)).isEqualTo("UNAUTHORIZED");
        assertThat(ApiErrorCode.fromStatus(403)).isEqualTo("FORBIDDEN");
        assertThat(ApiErrorCode.fromStatus(409)).isEqualTo("CONFLICT");
        assertThat(ApiErrorCode.fromStatus(422)).isEqualTo("BUSINESS_RULE");
        assertThat(ApiErrorCode.fromStatus(500)).isEqualTo("INTERNAL_ERROR");
    }
}
