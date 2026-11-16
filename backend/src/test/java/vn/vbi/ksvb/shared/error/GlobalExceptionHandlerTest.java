package vn.vbi.ksvb.shared.error;

import static org.hamcrest.Matchers.containsString;
import static org.hamcrest.Matchers.not;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.content;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

import jakarta.validation.Valid;
import jakarta.validation.constraints.NotBlank;
import java.util.Map;
import org.junit.jupiter.api.Test;
import org.springframework.dao.DataIntegrityViolationException;
import org.springframework.http.MediaType;
import org.springframework.orm.ObjectOptimisticLockingFailureException;
import org.springframework.security.access.AccessDeniedException;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.test.web.servlet.setup.MockMvcBuilders;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;
import vn.vbi.ksvb.shared.audit.BlockedActionAuditor;

/** Mọi lỗi đều trả RFC 7807 có {@code code} thuộc bộ mã chuẩn (ECOSYSTEM.md 12.2). */
class GlobalExceptionHandlerTest {

    record Body(@NotBlank(message = "Tên bắt buộc") String name) {
    }

    @RestController
    static class Dummy {
        @GetMapping("/t/{kind}")
        String fail(@PathVariable String kind) {
            switch (kind) {
                case "notfound" -> throw new NotFoundException("Nhân viên", 1);
                case "business" -> throw new BusinessException("HAS_CHILDREN", "Đơn vị còn đơn vị con");
                case "conflict" -> throw new ConflictException("PERMISSION_IN_USE", "Quyền đang dùng", Map.of("groups", 2));
                case "lock" -> throw new ObjectOptimisticLockingFailureException(Object.class, 1);
                case "integrity" -> throw new DataIntegrityViolationException("duplicate key value violates unique constraint");
                case "denied" -> throw new AccessDeniedException("x");
                default -> throw new IllegalStateException("boom");
            }
        }

        @PostMapping("/t")
        String create(@Valid @RequestBody Body body) {
            return "ok";
        }

        @GetMapping("/t-num")
        int num(@RequestParam int n) {
            return n;
        }
    }

    private final MockMvc mvc = MockMvcBuilders.standaloneSetup(new Dummy())
            .setControllerAdvice(new GlobalExceptionHandler(null)).build();

    @Test
    void blockedActionsGoToAuditor() throws Exception {
        BlockedActionAuditor auditor = org.mockito.Mockito.mock(BlockedActionAuditor.class);
        MockMvc audited = MockMvcBuilders.standaloneSetup(new Dummy())
                .setControllerAdvice(new GlobalExceptionHandler(auditor))
                .build();
        audited.perform(get("/t/business")).andExpect(status().isUnprocessableContent());
        audited.perform(get("/t/denied")).andExpect(status().isForbidden());
        org.mockito.Mockito.verify(auditor)
                .record(org.mockito.ArgumentMatchers.any(), org.mockito.ArgumentMatchers.eq("HAS_CHILDREN"),
                        org.mockito.ArgumentMatchers.eq("Đơn vị còn đơn vị con"));
        org.mockito.Mockito.verify(auditor)
                .record(org.mockito.ArgumentMatchers.any(), org.mockito.ArgumentMatchers.eq("FORBIDDEN"),
                        org.mockito.ArgumentMatchers.eq("Không có quyền thực hiện"));
    }

    @Test
    void notFound() throws Exception {
        mvc.perform(get("/t/notfound")).andExpect(status().isNotFound())
                .andExpect(content().contentTypeCompatibleWith(MediaType.APPLICATION_PROBLEM_JSON))
                .andExpect(jsonPath("$.code").value("NOT_FOUND"));
    }

    @Test
    void businessRuleKeepsReason() throws Exception {
        mvc.perform(get("/t/business")).andExpect(status().isUnprocessableContent())
                .andExpect(jsonPath("$.code").value("BUSINESS_RULE"))
                .andExpect(jsonPath("$.reason").value("HAS_CHILDREN"))
                .andExpect(jsonPath("$.detail").value("Đơn vị còn đơn vị con"));
    }

    @Test
    void conflictKeepsProperties() throws Exception {
        mvc.perform(get("/t/conflict")).andExpect(status().isConflict())
                .andExpect(jsonPath("$.code").value("CONFLICT"))
                .andExpect(jsonPath("$.reason").value("PERMISSION_IN_USE"))
                .andExpect(jsonPath("$.groups").value(2));
    }

    @Test
    void optimisticLockIsConflict() throws Exception {
        mvc.perform(get("/t/lock")).andExpect(status().isConflict())
                .andExpect(jsonPath("$.code").value("CONFLICT"))
                .andExpect(jsonPath("$.reason").value("CONCURRENT_UPDATE"));
    }

    @Test
    void integrityDoesNotLeakSql() throws Exception {
        mvc.perform(get("/t/integrity")).andExpect(status().isConflict())
                .andExpect(jsonPath("$.code").value("CONFLICT"))
                .andExpect(jsonPath("$.detail", not(containsString("constraint"))));
    }

    @Test
    void forbidden() throws Exception {
        mvc.perform(get("/t/denied")).andExpect(status().isForbidden())
                .andExpect(jsonPath("$.code").value("FORBIDDEN"));
    }

    @Test
    void unexpectedIsInternalError() throws Exception {
        mvc.perform(get("/t/other")).andExpect(status().isInternalServerError())
                .andExpect(jsonPath("$.code").value("INTERNAL_ERROR"))
                .andExpect(jsonPath("$.detail", not(containsString("boom"))));
    }

    @Test
    void validationErrorsIsArray() throws Exception {
        mvc.perform(post("/t").contentType(MediaType.APPLICATION_JSON).content("{\"name\":\"\"}"))
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.code").value("VALIDATION_ERROR"))
                .andExpect(jsonPath("$.errors[0].field").value("name"))
                .andExpect(jsonPath("$.errors[0].message").value("Tên bắt buộc"));
    }

    @Test
    void malformedBodyIsValidationError() throws Exception {
        mvc.perform(post("/t").contentType(MediaType.APPLICATION_JSON).content("{oops"))
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.code").value("VALIDATION_ERROR"))
                .andExpect(jsonPath("$.detail").value("Yêu cầu không hợp lệ"));
    }

    @Test
    void typeMismatchIsValidationError() throws Exception {
        mvc.perform(get("/t-num").param("n", "abc")).andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.code").value("VALIDATION_ERROR"));
    }
}
