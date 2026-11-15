package vn.vbi.ksvb.user.application;

import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import vn.vbi.ksvb.user.domain.AppUser;
import vn.vbi.ksvb.user.domain.UserRole;
import vn.vbi.ksvb.user.infra.UserRepository;

/**
 * Tạo người dùng KSVB ở lần đăng nhập đầu từ claim của token Keycloak (HRM là nguồn gốc dữ liệu nhân sự),
 * và cập nhật lại thông tin hiển thị ở các lần sau. Quyền KHÔNG lưu ở đây: luôn lấy từ client role trong token.
 */
@Service
public class UserProvisioningService {

    private static final String UNKNOWN_UNIT = "Chưa rõ";

    private final UserRepository users;

    public UserProvisioningService(UserRepository users) {
        this.users = users;
    }

    /** Thông tin lấy từ token. {@code unit}/{@code title} là tên nếu có, không thì mã (unit_code/position_code). */
    public record Claims(String email, String fullName, String employeeCode, String unit, String title) {}

    @Transactional
    public AppUser findOrCreate(Claims c) {
        return users.findByEmailIgnoreCase(c.email())
                .map(u -> {
                    u.syncProfile(c.fullName(), c.employeeCode(), c.unit(), c.title());
                    return u;
                })
                .orElseGet(() -> {
                    AppUser u = AppUser.of(null,
                            c.fullName() == null || c.fullName().isBlank() ? c.email() : c.fullName(),
                            c.email().toLowerCase(),
                            c.unit() == null || c.unit().isBlank() ? UNKNOWN_UNIT : c.unit(),
                            c.title(), UserRole.USER);
                    u.setEmployeeCode(c.employeeCode());
                    return users.save(u);
                });
    }
}
