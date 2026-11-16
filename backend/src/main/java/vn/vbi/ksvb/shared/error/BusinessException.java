package vn.vbi.ksvb.shared.error;

/** Vi phạm luật nghiệp vụ: HTTP 422, {@code code=BUSINESS_RULE}, {@code reason} = mã chi tiết (có thể null). */
public class BusinessException extends RuntimeException {

    private final String reason;

    public BusinessException(String reason, String message) {
        super(message);
        this.reason = reason;
    }

    public String getReason() {
        return reason;
    }
}
