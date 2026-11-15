package vn.vbi.ksvb.shared.error;

import jakarta.servlet.http.HttpServletRequest;
import java.util.ArrayList;
import java.util.List;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.dao.DataIntegrityViolationException;
import org.springframework.dao.OptimisticLockingFailureException;
import org.springframework.http.HttpHeaders;
import org.springframework.http.HttpStatus;
import org.springframework.http.HttpStatusCode;
import org.springframework.http.ProblemDetail;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.AccessDeniedException;
import org.springframework.web.bind.MethodArgumentNotValidException;
import org.springframework.web.bind.annotation.ExceptionHandler;
import org.springframework.web.bind.annotation.RestControllerAdvice;
import org.springframework.web.context.request.WebRequest;
import org.springframework.web.method.annotation.HandlerMethodValidationException;
import org.springframework.web.servlet.mvc.method.annotation.ResponseEntityExceptionHandler;
import vn.vbi.ksvb.shared.audit.BlockedActionAuditor;

/**
 * Chuẩn hoá lỗi theo RFC 7807 (ProblemDetail) + quy ước ECOSYSTEM.md 12.2: luôn có {@code code} ({@link ApiErrorCode}),
 * lỗi kiểm tra dữ liệu có thêm {@code errors[]} dạng {@code {field, message}}; {@code detail} tiếng Việt.
 * Kế thừa ResponseEntityExceptionHandler để các lỗi chuẩn của Spring MVC (400/404/405/415...) giữ đúng mã HTTP.
 */
@RestControllerAdvice
public class GlobalExceptionHandler extends ResponseEntityExceptionHandler {

    private static final Logger log = LoggerFactory.getLogger(GlobalExceptionHandler.class);

    private final BlockedActionAuditor blocked;

    public GlobalExceptionHandler(BlockedActionAuditor blocked) {
        this.blocked = blocked;
    }

    /** Một lỗi kiểm tra dữ liệu của một trường. */
    public record FieldError(String field, String message) {
    }

    /** ProblemDetail chuẩn: {@code code} (bộ mã 12.2), {@code reason} (mã nghiệp vụ chi tiết, nếu có). */
    public static ProblemDetail problem(HttpStatusCode status, String code, String reason, String detail) {
        ProblemDetail pd = ProblemDetail.forStatusAndDetail(status, detail);
        pd.setProperty("code", code);
        if (reason != null) {
            pd.setProperty("reason", reason);
        }
        return pd;
    }

    @ExceptionHandler(BusinessException.class)
    ProblemDetail business(BusinessException e, HttpServletRequest req) {
        if (!ApiErrorCode.VALIDATION_ERROR.equals(e.getCode())) {
            blocked.record(req, e.getCode(), e.getMessage());
        }
        return problem(HttpStatus.valueOf(e.getStatus()), e.getCode(), e.getReason(), e.getMessage());
    }

    @ExceptionHandler(OptimisticLockingFailureException.class)
    ProblemDetail conflict(OptimisticLockingFailureException e, HttpServletRequest req) {
        blocked.record(req, ApiErrorCode.CONFLICT, "Khoá lạc quan: dữ liệu đã bị người khác cập nhật");
        return problem(HttpStatus.CONFLICT, ApiErrorCode.CONFLICT, "CONCURRENT_UPDATE",
                "Văn bản vừa được người khác cập nhật. Vui lòng tải lại và thử lại.");
    }

    @ExceptionHandler(DataIntegrityViolationException.class)
    ProblemDetail integrity(DataIntegrityViolationException e) {
        log.warn("Vi phạm ràng buộc dữ liệu: {}", e.getMostSpecificCause().getMessage());
        return problem(HttpStatus.CONFLICT, ApiErrorCode.CONFLICT, "DATA_INTEGRITY",
                "Dữ liệu vi phạm ràng buộc, vui lòng kiểm tra lại.");
    }

    /** {@code @PreAuthorize} từ chối (người đã đăng nhập nhưng thiếu quyền). */
    @ExceptionHandler(AccessDeniedException.class)
    ProblemDetail denied(AccessDeniedException e, HttpServletRequest req) {
        blocked.record(req, ApiErrorCode.FORBIDDEN, "Thiếu quyền");
        return problem(HttpStatus.FORBIDDEN, ApiErrorCode.FORBIDDEN, null, "Bạn không có quyền thực hiện thao tác này.");
    }

    /** Lỗi không lường trước: không lộ chi tiết ra ngoài, ghi log đầy đủ. */
    @ExceptionHandler(Exception.class)
    ProblemDetail unexpected(Exception e) {
        log.error("Lỗi không xử lý được", e);
        return problem(HttpStatus.INTERNAL_SERVER_ERROR, ApiErrorCode.INTERNAL_ERROR, null,
                "Lỗi hệ thống, vui lòng thử lại sau.");
    }

    @Override
    protected ResponseEntity<Object> handleMethodArgumentNotValid(
            MethodArgumentNotValidException ex, HttpHeaders headers, HttpStatusCode status, WebRequest request) {
        List<FieldError> errors = new ArrayList<>();
        ex.getBindingResult().getFieldErrors()
                .forEach(f -> errors.add(new FieldError(f.getField(), f.getDefaultMessage())));
        ex.getBindingResult().getGlobalErrors()
                .forEach(g -> errors.add(new FieldError(g.getObjectName(), g.getDefaultMessage())));
        return validation(errors);
    }

    @Override
    protected ResponseEntity<Object> handleHandlerMethodValidationException(
            HandlerMethodValidationException ex, HttpHeaders headers, HttpStatusCode status, WebRequest request) {
        List<FieldError> errors = new ArrayList<>();
        ex.getParameterValidationResults().forEach(r -> r.getResolvableErrors().forEach(err -> errors.add(
                new FieldError(r.getMethodParameter().getParameterName(), err.getDefaultMessage()))));
        return validation(errors);
    }

    private static ResponseEntity<Object> validation(List<FieldError> errors) {
        ProblemDetail pd = problem(HttpStatus.BAD_REQUEST, ApiErrorCode.VALIDATION_ERROR, null, "Dữ liệu không hợp lệ");
        pd.setProperty("errors", errors);
        return ResponseEntity.badRequest().body(pd);
    }

    /** Các lỗi chuẩn khác của Spring MVC (thiếu tham số, sai kiểu, 404, 405, 413...): thêm {@code code}. */
    @Override
    protected ResponseEntity<Object> handleExceptionInternal(
            Exception ex, Object body, HttpHeaders headers, HttpStatusCode statusCode, WebRequest request) {
        ResponseEntity<Object> res = super.handleExceptionInternal(ex, body, headers, statusCode, request);
        if (res != null && res.getBody() instanceof ProblemDetail pd) {
            int s = statusCode.value();
            if (pd.getProperties() == null || !pd.getProperties().containsKey("code")) {
                pd.setProperty("code", ApiErrorCode.fromStatus(s));
            }
            if (s == 413) {
                pd.setDetail("Tệp vượt quá dung lượng cho phép.");
            }
        }
        return res;
    }
}
