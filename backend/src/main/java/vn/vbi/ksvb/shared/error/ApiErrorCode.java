package vn.vbi.ksvb.shared.error;

import org.springframework.http.HttpStatusCode;

/**
 * Bộ mã lỗi chuẩn (docs/kien-truc-chuan.md 3.1), luôn nằm ở thuộc tính {@code code} của ProblemDetail. Mã nghiệp vụ chi
 * tiết (vd {@code HAS_CHILDREN}) nằm ở thuộc tính {@code reason}.
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

    /** Mã chuẩn suy từ mã HTTP, dùng cho lỗi do Spring sinh ra (400, 401, 404, 405, 415...). */
    public static String fromStatus(HttpStatusCode status) {
        int s = status.value();
        if (s == 401) return UNAUTHORIZED;
        if (s == 403) return FORBIDDEN;
        if (s == 404) return NOT_FOUND;
        if (s == 409) return CONFLICT;
        if (s == 422) return BUSINESS_RULE;
        if (status.is5xxServerError()) return INTERNAL_ERROR;
        return VALIDATION_ERROR;
    }
}
