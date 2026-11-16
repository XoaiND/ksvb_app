package vn.vbi.ksvb.shared.error;

import java.util.Map;

/** Xung đột trạng thái, trả HTTP 409 kèm mã lỗi và các thuộc tính bổ sung (vd danh sách nhóm đang dùng quyền). */
public class ConflictException extends RuntimeException {
    private final String code;
    private final transient Map<String, Object> properties;

    public ConflictException(String code, String message, Map<String, Object> properties) {
        super(message);
        this.code = code;
        this.properties = properties == null ? Map.of() : properties;
    }

    public String getCode() {
        return code;
    }

    public Map<String, Object> getProperties() {
        return properties;
    }
}
