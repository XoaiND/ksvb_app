package ksvb.shared.security;

import java.util.Collection;
import java.util.Optional;

/**
 * Chế độ dev (bảo mật tắt): mỗi app cài một resolver ở {@code <feature>/infra} để biết ai là người đang thao tác và có
 * quyền gì. Chỉ dùng khi {@code <app>.security.enabled=false} (bị chặn ở profile prod).
 */
public interface DevUserResolver {

    /** Người dùng giả cùng quyền (authority). */
    record DevUser(String username, Collection<String> authorities) {}

    /**
     * @param userIdHeader giá trị header {@code X-User-Id} (null/rỗng nếu client không gửi)
     * @return người dùng giả; rỗng thì request đi tiếp như người chưa đăng nhập
     * @throws IllegalArgumentException khi header không hợp lệ (filter trả 400)
     */
    Optional<DevUser> resolve(String userIdHeader);
}
