package vn.vbi.ksvb.config;

import java.util.List;
import org.springframework.boot.context.properties.ConfigurationProperties;

/** Cấu hình ứng dụng (tiền tố {@code ksvb} trong application.yml). */
@ConfigurationProperties(prefix = "ksvb")
public record KsvbProperties(Security security, Storage storage, Cors cors, boolean seedDemo) {

    /**
     * enabled=true (mặc định): bắt buộc JWT Keycloak, quyền = client role {@code roleClient}.
     * enabled=false: CHỈ để dev/test — không đăng nhập, người dùng lấy từ header X-User-Id, quyền suy từ
     * cột app_user.role. Bị chặn khi chạy profile prod.
     */
    public record Security(boolean enabled, String roleClient) {}

    public record Storage(String path) {}

    public record Cors(List<String> allowedOrigins) {}
}
