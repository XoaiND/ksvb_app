package vn.vbi.ksvb.shared.error;

import static org.assertj.core.api.Assertions.assertThat;

import org.junit.jupiter.api.Test;
import org.springframework.http.ProblemDetail;
import org.springframework.mock.web.MockHttpServletRequest;
import vn.vbi.ksvb.shared.audit.BlockedActionAuditor;

/** Định dạng ProblemDetail chuẩn (ECOSYSTEM.md 12.2, 12.7): {@code code} theo bộ mã, {@code reason} khi có. */
class GlobalExceptionHandlerTest {

    private final GlobalExceptionHandler handler = new GlobalExceptionHandler(new BlockedActionAuditor(null, null) {
        @Override
        public void record(jakarta.servlet.http.HttpServletRequest req, String code, String message) {
        }
    });

    @Test
    void luatNghiepVu_422_businessRule_kemReason() {
        ProblemDetail p = handler.business(BusinessException.businessRule("Cần ít nhất một người ký")
                .withReason("NO_SIGNER"), new MockHttpServletRequest("POST", "/api/sign-requests/1/submit"));
        assertThat(p.getStatus()).isEqualTo(422);
        assertThat(p.getProperties()).containsEntry("code", "BUSINESS_RULE").containsEntry("reason", "NO_SIGNER");
        assertThat(p.getDetail()).isEqualTo("Cần ít nhất một người ký");
    }

    @Test
    void khongCoReason_thiKhongCoThuocTinh() {
        ProblemDetail p = handler.business(BusinessException.notFound("Không tìm thấy văn bản"),
                new MockHttpServletRequest("GET", "/api/sign-requests/9"));
        assertThat(p.getStatus()).isEqualTo(404);
        assertThat(p.getProperties()).containsEntry("code", "NOT_FOUND").doesNotContainKey("reason");
    }

    @Test
    void maChuanSuyTuHttp() {
        assertThat(ApiErrorCode.fromStatus(400)).isEqualTo("VALIDATION_ERROR");
        assertThat(ApiErrorCode.fromStatus(401)).isEqualTo("FORBIDDEN");
        assertThat(ApiErrorCode.fromStatus(409)).isEqualTo("CONFLICT");
        assertThat(ApiErrorCode.fromStatus(422)).isEqualTo("BUSINESS_RULE");
        assertThat(ApiErrorCode.fromStatus(500)).isEqualTo("INTERNAL_ERROR");
    }
}
