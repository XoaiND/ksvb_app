package ksvb.user.application;

import java.time.LocalDateTime;
import java.util.Base64;
import org.jspecify.annotations.Nullable;

/**
 * Ảnh chữ ký đã tách nền (PNG trong suốt) dạng data URL để giao diện hiển thị trực tiếp; ảnh nhỏ (rộng ≤ 600px) nên
 * gửi kèm JSON. {@code updatedAt} null với ảnh xem trước (chưa lưu).
 */
public record SignatureDto(String imageDataUrl, @Nullable LocalDateTime updatedAt) {

    static SignatureDto of(byte[] png, @Nullable LocalDateTime updatedAt) {
        return new SignatureDto("data:image/png;base64," + Base64.getEncoder().encodeToString(png), updatedAt);
    }
}
