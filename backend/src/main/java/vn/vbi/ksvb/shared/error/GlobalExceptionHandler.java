package vn.vbi.ksvb.shared.error;

import jakarta.servlet.http.HttpServletRequest;
import jakarta.validation.ConstraintViolationException;
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
import org.springframework.security.core.AuthenticationException;
import org.springframework.web.bind.MethodArgumentNotValidException;
import org.springframework.web.bind.annotation.ExceptionHandler;
import org.springframework.web.bind.annotation.RestControllerAdvice;
import org.springframework.web.context.request.WebRequest;
import org.springframework.web.method.annotation.HandlerMethodValidationException;
import org.springframework.web.servlet.mvc.method.annotation.ResponseEntityExceptionHandler;
import vn.vbi.ksvb.shared.audit.BlockedActionAuditor;

/**
 * Chuẩn hoá lỗi theo RFC 7807 (docs/kien-truc-chuan.md mục 3.1): luôn có {@code code} ({@link ApiErrorCode}),
 * {@code reason} (mã nghiệp vụ chi tiết, nếu có), {@code errors[]} = {@code {field, message}} cho lỗi dữ liệu,
 * {@code detail} tiếng Việt. Thao tác ghi bị chặn (403/409/422) được ghi nhật ký qua {@link BlockedActionAuditor}.
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

    public static ProblemDetail problem(HttpStatusCode status, String code, String reason, String detail) {
        ProblemDetail pd = ProblemDetail.forStatusAndDetail(status, detail);
        pd.setProperty("code", code);
        if (reason != null) {
            pd.setProperty("reason", reason);
        }
        return pd;
    }

    private ProblemDetail audited(HttpServletRequest req, ProblemDetail p) {
        blocked.record(req, String.valueOf(p.getProperties().get("code")), p.getDetail());
        return p;
    }

    @ExceptionHandler(NotFoundException.class)
    ProblemDetail notFound(NotFoundException e) {
        return problem(HttpStatus.NOT_FOUND, ApiErrorCode.NOT_FOUND, null, e.getMessage());
    }

    @ExceptionHandler(BusinessException.class)
    ProblemDetail business(BusinessException e, HttpServletRequest req) {
        return audited(req, problem(HttpStatus.UNPROCESSABLE_ENTITY, ApiErrorCode.BUSINESS_RULE, e.getReason(),
                e.getMessage()));
    }

    @ExceptionHandler(ConflictException.class)
    ProblemDetail conflict(ConflictException e, HttpServletRequest req) {
        ProblemDetail p = problem(HttpStatus.CONFLICT, ApiErrorCode.CONFLICT, e.getReason(), e.getMessage());
        e.getProperties().forEach(p::setProperty);
        return audited(req, p);
    }

    @ExceptionHandler(OptimisticLockingFailureException.class)
    ProblemDetail optimistic(OptimisticLockingFailureException e, HttpServletRequest req) {
        return audited(req, problem(HttpStatus.CONFLICT, ApiErrorCode.CONFLICT, "CONCURRENT_UPDATE",
                "Dữ liệu đã bị người khác thay đổi, vui lòng tải lại"));
    }

    @ExceptionHandler(DataIntegrityViolationException.class)
    ProblemDetail integrity(DataIntegrityViolationException e, HttpServletRequest req) {
        log.warn("Vi phạm ràng buộc dữ liệu: {}", e.getMostSpecificCause().getMessage());
        return audited(req, problem(HttpStatus.CONFLICT, ApiErrorCode.CONFLICT, "DATA_INTEGRITY",
                "Dữ liệu vi phạm ràng buộc, vui lòng kiểm tra lại"));
    }

    @ExceptionHandler(ConstraintViolationException.class)
    ResponseEntity<Object> constraint(ConstraintViolationException e) {
        List<FieldError> errors = e.getConstraintViolations().stream()
                .map(v -> new FieldError(lastNode(v.getPropertyPath().toString()), v.getMessage())).toList();
        return validation(errors);
    }

    /** Thiếu quyền ({@code @PreAuthorize} hoặc service kiểm): 403, detail = thông điệp nếu có. */
    @ExceptionHandler(AccessDeniedException.class)
    ProblemDetail denied(AccessDeniedException e, HttpServletRequest req) {
        String msg = e.getMessage();
        boolean vietnamese = msg != null && !msg.isBlank() && !msg.startsWith("Access Denied");
        return audited(req, problem(HttpStatus.FORBIDDEN, ApiErrorCode.FORBIDDEN, null,
                vietnamese ? msg : "Không có quyền thực hiện"));
    }

    @ExceptionHandler(AuthenticationException.class)
    ProblemDetail unauthenticated(AuthenticationException e) {
        return problem(HttpStatus.UNAUTHORIZED, ApiErrorCode.UNAUTHORIZED, null,
                "Chưa đăng nhập hoặc phiên đăng nhập đã hết hạn");
    }

    /** Lỗi không lường trước: không lộ chi tiết ra ngoài, ghi log đầy đủ. */
    @ExceptionHandler(Exception.class)
    ProblemDetail unexpected(Exception e) {
        log.error("Lỗi không xử lý được", e);
        return problem(HttpStatus.INTERNAL_SERVER_ERROR, ApiErrorCode.INTERNAL_ERROR, null,
                "Lỗi hệ thống, vui lòng thử lại sau");
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
                pd.setDetail("Tệp vượt quá dung lượng cho phép");
            }
        }
        return res;
    }

    private static String lastNode(String path) {
        int i = path.lastIndexOf('.');
        return i < 0 ? path : path.substring(i + 1);
    }
}
