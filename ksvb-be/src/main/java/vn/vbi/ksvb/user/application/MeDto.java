package vn.vbi.ksvb.user.application;

import java.util.List;
import vn.vbi.ksvb.user.domain.AppUser;

/** Người đang đăng nhập + quyền (client role) của lần gọi này — giao diện dùng để ẩn/hiện menu và nút. */
public record MeDto(Long id, String fullName, String email, String employeeCode, String unitName, String jobTitle,
                    List<String> permissions) {
    public static MeDto of(AppUser u) {
        return new MeDto(u.getId(), u.getFullName(), u.getEmail(), u.getEmployeeCode(), u.getUnitName(),
                u.getJobTitle(), u.getPermissions().stream().sorted().toList());
    }
}
