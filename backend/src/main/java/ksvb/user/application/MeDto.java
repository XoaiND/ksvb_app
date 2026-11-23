package ksvb.user.application;

import java.time.LocalDateTime;
import java.util.List;
import ksvb.user.domain.AppUser;
import org.jspecify.annotations.Nullable;

/**
 * Người đang đăng nhập + quyền (client role) của lần gọi này — giao diện dùng để ẩn/hiện menu và nút.
 * {@code hasSignature}: đã có ảnh chữ ký (cần để ký văn bản).
 */
public record MeDto(Long id, String fullName, String email, @Nullable String employeeCode, @Nullable String unitName,
                    @Nullable String jobTitle,
                    List<String> permissions, boolean hasSignature, @Nullable LocalDateTime signatureUpdatedAt) {
    public static MeDto of(AppUser u) {
        return new MeDto(u.getId(), u.getFullName(), u.getEmail(), u.getEmployeeCode(), u.getUnitName(),
                u.getJobTitle(), u.getPermissions().stream().sorted().toList(), u.hasSignature(),
                u.getSignatureUpdatedAt());
    }
}
