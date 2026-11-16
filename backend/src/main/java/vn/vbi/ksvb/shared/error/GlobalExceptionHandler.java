package vn.vbi.ksvb.shared.error;

import jakarta.servlet.http.HttpServletRequest;
import jakarta.validation.ConstraintViolationException;
import java.util.ArrayList;
import java.util.List;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.context.MessageSourceResolvable;
import org.springframework.dao.DataIntegrityViolationException;
import org.springframework.dao.OptimisticLockingFailureException;
import org.springframework.http.HttpHeaders;
import org.springframework.http.HttpStatus;
import org.springframework.http.HttpStatusCode;
import org.springframework.http.ProblemDetail;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.AccessDeniedException;
import org.springframework.security.core.AuthenticationException;
import org.springframework.validation.FieldError;
import org.springframework.web.bind.MethodArgumentNotValidException;
import org.springframework.web.bind.annotation.ExceptionHandler;
import org.springframework.web.bind.annotation.RestControllerAdvice;
import org.springframework.web.client.ResourceAccessException;
import org.springframework.web.context.request.WebRequest;
import org.springframework.web.method.annotation.HandlerMethodValidationException;
import org.springframework.web.servlet.mvc.method.annotation.ResponseEntityExceptionHandler;
import vn.vbi.ksvb.shared.audit.BlockedActionAuditor;

/**
 * Mọi lỗi API trả RFC 7807 với {@code code} thuộc bộ mã chuẩn ({@link ApiErrorCode}),
 * {@code reason} = mã nghiệp vụ chi tiết (nếu có), {@code errors[]} = {field, message} khi dữ liệu không hợp lệ,
 * {@code detail} tiếng Việt. Lỗi chuẩn của Spring MVC (400/404/405/415...) đi qua {@link #handleExceptionInternal}.
 */
@RestControllerAdvice
public class GlobalExceptionHandler extends ResponseEntityExceptionHandler {

    private static final Logger log = LoggerFactory.getLogger(GlobalExceptionHandler.class);

    /** Ghi audit_log result=ERROR cho thao tác ghi bị chặn. */
    private final BlockedActionAuditor blocked;

    public GlobalExceptionHandler(BlockedActionAuditor blocked) {
        this.blocked = blocked;
    }

    private ProblemDetail audited(HttpServletRequest req, ProblemDetail p) {
        Object code = p.getProperties() == null ? null : p.getProperties().getOrDefault("reason", p.getProperties().get("code"));
        if (blocked != null) blocked.record(req, String.valueOf(code), p.getDetail());
        return p;
    }

    /** Một lỗi kiểm tra dữ liệu của một trường. {@code field} rỗng khi lỗi không gắn trường nào. */
    public record FieldViolation(String field, String message) {
    }

    @ExceptionHandler(NotFoundException.class)
    ProblemDetail notFound(NotFoundException e) {
        return problem(HttpStatus.NOT_FOUND, ApiErrorCode.NOT_FOUND, null, e.getMessage());
    }

    @ExceptionHandler(BusinessException.class)
    ProblemDetail business(BusinessException e, HttpServletRequest req) {
        return audited(req, problem(HttpStatus.UNPROCESSABLE_ENTITY, ApiErrorCode.BUSINESS_RULE, e.getCode(), e.getMessage()));
    }

    @ExceptionHandler(ConflictException.class)
    ProblemDetail conflict(ConflictException e, HttpServletRequest req) {
        ProblemDetail p = problem(HttpStatus.CONFLICT, ApiErrorCode.CONFLICT, e.getCode(), e.getMessage());
        e.getProperties().forEach(p::setProperty);
        return audited(req, p);
    }

    @ExceptionHandler(OptimisticLockingFailureException.class)
    ProblemDetail optimisticLock(OptimisticLockingFailureException e, HttpServletRequest req) {
        return audited(req, problem(HttpStatus.CONFLICT, ApiErrorCode.CONFLICT, "CONCURRENT_UPDATE",
                "Dữ liệu đã bị người khác thay đổi, vui lòng tải lại"));
    }

    @ExceptionHandler(DataIntegrityViolationException.class)
    ProblemDetail integrity(DataIntegrityViolationException e, HttpServletRequest req) {
        // Không trả thông điệp của Postgres ra ngoài (lộ tên bảng/ràng buộc, không phải tiếng Việt): chỉ ghi log.
        log.warn("Vi pham rang buoc du lieu: {}", e.getMostSpecificCause().getMessage());
        return audited(req, problem(HttpStatus.CONFLICT, ApiErrorCode.CONFLICT, "DATA_INTEGRITY",
                "Dữ liệu vi phạm ràng buộc (trùng hoặc đang được dùng ở nơi khác)"));
    }

    @ExceptionHandler(ConstraintViolationException.class)
    ProblemDetail constraint(ConstraintViolationException e) {
        List<FieldViolation> errors = e.getConstraintViolations().stream()
                .map(v -> new FieldViolation(lastNode(v.getPropertyPath().toString()), v.getMessage()))
                .toList();
        return validation(errors);
    }

    /** Không tới được dịch vụ ngoài (vd Keycloak): 503 để giao diện hiện thông báo mất kết nối. */
    @ExceptionHandler(ResourceAccessException.class)
    ProblemDetail unavailable(ResourceAccessException e) {
        return problem(HttpStatus.SERVICE_UNAVAILABLE, ApiErrorCode.INTERNAL_ERROR, "SERVICE_UNAVAILABLE",
                "Không kết nối được dịch vụ bên ngoài, vui lòng thử lại sau");
    }

    @ExceptionHandler(AccessDeniedException.class)
    ProblemDetail denied(AccessDeniedException e, HttpServletRequest req) {
        return audited(req, problem(HttpStatus.FORBIDDEN, ApiErrorCode.FORBIDDEN, null, "Không có quyền thực hiện"));
    }

    @ExceptionHandler(AuthenticationException.class)
    ProblemDetail unauthenticated(AuthenticationException e) {
        return problem(HttpStatus.UNAUTHORIZED, ApiErrorCode.UNAUTHORIZED, null,
                "Chưa đăng nhập hoặc phiên đăng nhập đã hết hạn");
    }

    @ExceptionHandler(Exception.class)
    ProblemDetail unexpected(Exception e) {
        log.error("Loi khong mong doi", e);
        return problem(HttpStatus.INTERNAL_SERVER_ERROR, ApiErrorCode.INTERNAL_ERROR, null,
                "Lỗi hệ thống, vui lòng thử lại sau");
    }

    @Override
    protected ResponseEntity<Object> handleMethodArgumentNotValid(MethodArgumentNotValidException e, HttpHeaders headers,
                                                                  HttpStatusCode status, WebRequest request) {
        List<FieldViolation> errors = new ArrayList<>();
        e.getBindingResult().getFieldErrors()
                .forEach(f -> errors.add(new FieldViolation(f.getField(), f.getDefaultMessage())));
        e.getBindingResult().getGlobalErrors()
                .forEach(g -> errors.add(new FieldViolation("", g.getDefaultMessage())));
        return ResponseEntity.badRequest().body(validation(errors));
    }

    @Override
    protected ResponseEntity<Object> handleHandlerMethodValidationException(HandlerMethodValidationException e,
                                                                            HttpHeaders headers, HttpStatusCode status,
                                                                            WebRequest request) {
        List<FieldViolation> errors = new ArrayList<>();
        e.getParameterValidationResults().forEach(r -> {
            String name = r.getMethodParameter().getParameterName();
            for (MessageSourceResolvable err : r.getResolvableErrors()) {
                String field = err instanceof FieldError f ? f.getField() : (name == null ? "" : name);
                errors.add(new FieldViolation(field, err.getDefaultMessage()));
            }
        });
        return ResponseEntity.badRequest().body(validation(errors));
    }

    /** Lỗi chuẩn của Spring MVC (body sai định dạng, thiếu tham số, sai kiểu, 404, 405...): thêm {@code code}, detail tiếng Việt. */
    @Override
    protected ResponseEntity<Object> handleExceptionInternal(Exception e, Object body, HttpHeaders headers,
                                                             HttpStatusCode status, WebRequest request) {
        ProblemDetail p = problem(status, ApiErrorCode.fromStatus(status), null, vietnameseDetail(status));
        return ResponseEntity.status(status).headers(headers).body(p);
    }

    private static ProblemDetail validation(List<FieldViolation> errors) {
        ProblemDetail p = problem(HttpStatus.BAD_REQUEST, ApiErrorCode.VALIDATION_ERROR, null, "Dữ liệu không hợp lệ");
        p.setProperty("errors", errors);
        return p;
    }

    private static String vietnameseDetail(HttpStatusCode status) {
        return switch (status.value()) {
            case 400 -> "Yêu cầu không hợp lệ";
            case 404 -> "Không tìm thấy";
            case 405 -> "Phương thức không được hỗ trợ";
            case 406, 415 -> "Định dạng dữ liệu không được hỗ trợ";
            case 413 -> "Dữ liệu gửi lên quá lớn";
            default -> status.is5xxServerError() ? "Lỗi hệ thống, vui lòng thử lại sau" : "Yêu cầu không hợp lệ";
        };
    }

    private static String lastNode(String path) {
        int i = path.lastIndexOf('.');
        return i < 0 ? path : path.substring(i + 1);
    }

    static ProblemDetail problem(HttpStatusCode status, String code, String reason, String detail) {
        ProblemDetail p = ProblemDetail.forStatusAndDetail(status, detail);
        p.setProperty("code", code);
        if (reason != null) p.setProperty("reason", reason);
        return p;
    }
}
