package vn.vbi.ksvb.shared.error;

/**
 * Bộ mã lỗi chuẩn (docs/kien-truc-chuan.md mục 3.1), luôn nằm ở thuộc tính {@code code} của ProblemDetail. Mã nghiệp
 * vụ chi tiết (vd. {@code CONCURRENT_UPDATE}) nằm ở thuộc tính {@code reason}.
 */
public final class ApiErrorCode {

    public static final String VALIDATION_ERROR = "VALIDATION_ERROR";
    public static final String UNAUTHORIZED = "UNAUTHORIZED";
    public static final String FORBIDDEN = "FORBIDDEN";
    public static final String NOT_FOUND = "NOT_FOUND";
    public static final String CONFLICT = "CONFLICT";
    public static final String BUSINESS_RULE = "BUSINESS_RULE";
    public static final String INTERNAL_ERROR = "INTERNAL_ERROR";

    private ApiErrorCode() {
    }

    /** Mã chuẩn suy từ mã HTTP, dùng cho lỗi do Spring sinh ra (400, 404, 405, 413, 415...). */
    public static String fromStatus(int s) {
        if (s == 401) return UNAUTHORIZED;
        if (s == 403) return FORBIDDEN;
        if (s == 404) return NOT_FOUND;
        if (s == 409 || s == 412) return CONFLICT;
        if (s == 422) return BUSINESS_RULE;
        if (s >= 500) return INTERNAL_ERROR;
        return VALIDATION_ERROR;
    }
}
