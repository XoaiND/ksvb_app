package vn.vbi.ksvb.shared.security;

import java.util.Optional;
import org.springframework.security.core.Authentication;

/**
 * Chế độ dev (security.enabled=false): xác định người đang thao tác từ giá trị header {@code X-User-Id}. Mỗi app cài đặt
 * một bản ở {@code <feature>/infra} (vd. lấy người dùng trong DB và suy quyền, hoặc cấp toàn quyền); chỉ có hiệu lực
 * khi bảo mật tắt, bị chặn ở profile {@code prod}.
 */
public interface DevUserResolver {

    /**
     * @param userId giá trị header {@code X-User-Id}, null hoặc rỗng nếu client không gửi
     * @return xác thực của người dùng dev, hoặc rỗng nếu không có người dùng hợp lệ (request chạy như chưa đăng nhập)
     * @throws IllegalArgumentException nếu giá trị header sai định dạng (filter trả 400)
     */
    Optional<Authentication> resolve(String userId);
}
