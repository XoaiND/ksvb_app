package vn.vbi.ksvb.shared.error;

/**
 * Mã lỗi chung trong thuộc tính {@code code} của ProblemDetail (ECOSYSTEM.md 12.2). FE dựa vào mã, không dựa vào
 * câu chữ của {@code detail}.
 */
public final class ErrorCode {

    public static final String VALIDATION_ERROR = "VALIDATION_ERROR";
    public static final String UNAUTHORIZED = "UNAUTHORIZED";
    public static final String NOT_FOUND = "NOT_FOUND";
    public static final String FORBIDDEN = "FORBIDDEN";
    public static final String CONFLICT = "CONFLICT";
    public static final String BUSINESS_RULE = "BUSINESS_RULE";
    public static final String INTERNAL_ERROR = "INTERNAL_ERROR";

    private ErrorCode() {
    }

    /** Mã mặc định theo HTTP status, dùng cho lỗi chuẩn của Spring và {@link BusinessException} không ghi mã. */
    public static String forStatus(int status) {
        return switch (status) {
            case 400 -> BUSINESS_RULE;
            case 401 -> UNAUTHORIZED;
            case 403 -> FORBIDDEN;
            case 404 -> NOT_FOUND;
            case 409, 412 -> CONFLICT;
            default -> status >= 500 ? INTERNAL_ERROR : BUSINESS_RULE;
        };
    }
}
