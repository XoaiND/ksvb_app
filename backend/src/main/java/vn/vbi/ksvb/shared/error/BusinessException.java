package vn.vbi.ksvb.shared.error;

/**
 * Lỗi nghiệp vụ có mã HTTP, mã chuẩn ({@link ApiErrorCode}, suy từ HTTP) và mã nghiệp vụ chi tiết {@code reason}
 * (tuỳ chọn); thông điệp tiếng Việt, hiển thị được cho người dùng. Không phụ thuộc Spring để luật trong domain dùng được.
 * <ul>
 *   <li>{@link #invalid} 400 {@code VALIDATION_ERROR}: dữ liệu gửi lên sai (tệp không phải PDF...)</li>
 *   <li>{@link #businessRule} 422 {@code BUSINESS_RULE}: vi phạm luật nghiệp vụ (như HRM)</li>
 *   <li>{@link #forbidden} 403, {@link #notFound} 404, {@link #conflict} 409</li>
 * </ul>
 */
public class BusinessException extends RuntimeException {

    private final int status;
    private final String code;
    private final String reason;

    public BusinessException(int status, String reason, String message) {
        super(message);
        this.status = status;
        this.code = ApiErrorCode.fromStatus(status);
        this.reason = reason;
    }

    /** Mã HTTP. */
    public int getStatus() {
        return status;
    }

    /** Mã chuẩn (thuộc tính {@code code}). */
    public String getCode() {
        return code;
    }

    /** Mã nghiệp vụ chi tiết (thuộc tính {@code reason}), có thể null. */
    public String getReason() {
        return reason;
    }

    public static BusinessException businessRule(String message) {
        return new BusinessException(422, null, message);
    }

    public static BusinessException invalid(String message) {
        return new BusinessException(400, null, message);
    }

    public static BusinessException forbidden(String message) {
        return new BusinessException(403, null, message);
    }

    public static BusinessException notFound(String message) {
        return new BusinessException(404, null, message);
    }

    public static BusinessException conflict(String message) {
        return new BusinessException(409, null, message);
    }

    /** Cùng loại lỗi, gắn thêm mã nghiệp vụ chi tiết. */
    public BusinessException withReason(String r) {
        BusinessException e = new BusinessException(status, r, getMessage());
        e.setStackTrace(getStackTrace());
        return e;
    }
}
