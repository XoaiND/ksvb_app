package vn.vbi.ksvb.shared.error;

/**
 * Lỗi nghiệp vụ có mã HTTP và mã lỗi ({@link ErrorCode}) đi kèm; thông điệp tiếng Việt, hiển thị được cho người dùng.
 * Không phụ thuộc Spring để luật trong domain dùng được. Mặc định mã suy từ HTTP status: 400 → {@code BUSINESS_RULE},
 * 403 → {@code FORBIDDEN}, 404 → {@code NOT_FOUND}, 409 → {@code CONFLICT}.
 */
public class BusinessException extends RuntimeException {

    private final int status;
    private final String code;

    public BusinessException(int status, String message) {
        this(status, ErrorCode.forStatus(status), message);
    }

    public BusinessException(int status, String code, String message) {
        super(message);
        this.status = status;
        this.code = code;
    }

    /** Mã HTTP. */
    public int getStatus() {
        return status;
    }

    public String getCode() {
        return code;
    }

    public static BusinessException badRequest(String message) {
        return new BusinessException(400, message);
    }

    /** Dữ liệu đầu vào sai (không phải luật nghiệp vụ), vd. tệp không phải PDF. */
    public static BusinessException invalid(String message) {
        return new BusinessException(400, ErrorCode.VALIDATION_ERROR, message);
    }

    public static BusinessException forbidden(String message) {
        return new BusinessException(403, message);
    }

    public static BusinessException notFound(String message) {
        return new BusinessException(404, message);
    }

    public static BusinessException conflict(String message) {
        return new BusinessException(409, message);
    }
}
