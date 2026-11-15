package vn.vbi.ksvb.common;

import org.springframework.http.HttpStatus;

/**
 * Lỗi nghiệp vụ có mã HTTP và mã lỗi ({@link ErrorCode}) đi kèm; thông điệp tiếng Việt, hiển thị được cho người dùng.
 * Mặc định mã suy từ HTTP status: 400 → {@code BUSINESS_RULE}, 403 → {@code FORBIDDEN}, 404 → {@code NOT_FOUND},
 * 409 → {@code CONFLICT}.
 */
public class BusinessException extends RuntimeException {

    private final HttpStatus status;
    private final String code;

    public BusinessException(HttpStatus status, String message) {
        this(status, ErrorCode.forStatus(status.value()), message);
    }

    public BusinessException(HttpStatus status, String code, String message) {
        super(message);
        this.status = status;
        this.code = code;
    }

    public HttpStatus getStatus() {
        return status;
    }

    public String getCode() {
        return code;
    }

    public static BusinessException badRequest(String message) {
        return new BusinessException(HttpStatus.BAD_REQUEST, message);
    }

    /** Dữ liệu đầu vào sai (không phải luật nghiệp vụ), vd. tệp không phải PDF. */
    public static BusinessException invalid(String message) {
        return new BusinessException(HttpStatus.BAD_REQUEST, ErrorCode.VALIDATION_ERROR, message);
    }

    public static BusinessException forbidden(String message) {
        return new BusinessException(HttpStatus.FORBIDDEN, message);
    }

    public static BusinessException notFound(String message) {
        return new BusinessException(HttpStatus.NOT_FOUND, message);
    }

    public static BusinessException conflict(String message) {
        return new BusinessException(HttpStatus.CONFLICT, message);
    }
}
