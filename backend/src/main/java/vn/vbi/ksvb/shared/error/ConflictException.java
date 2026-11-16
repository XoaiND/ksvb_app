package vn.vbi.ksvb.shared.error;

import java.util.Map;

/**
 * Xung đột trạng thái (sai trạng thái, chưa đến lượt, người khác vừa sửa): HTTP 409, {@code code=CONFLICT},
 * {@code reason} = mã chi tiết, kèm thuộc tính bổ sung tuỳ chọn.
 */
public class ConflictException extends RuntimeException {

    private final String reason;
    private final transient Map<String, Object> properties;

    public ConflictException(String reason, String message) {
        this(reason, message, Map.of());
    }

    public ConflictException(String reason, String message, Map<String, Object> properties) {
        super(message);
        this.reason = reason;
        this.properties = properties == null ? Map.of() : properties;
    }

    public String getReason() {
        return reason;
    }

    public Map<String, Object> getProperties() {
        return properties;
    }
}
