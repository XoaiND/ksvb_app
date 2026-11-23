package ksvb.signrequest.application;

import java.time.LocalDateTime;
import ksvb.signrequest.domain.Attachment;
import org.jspecify.annotations.Nullable;

/**
 * {@code signed}: đã có bản đóng chữ ký (tải bằng {@code ?signed=true}); {@code signedSizeBytes},
 * {@code signedSha256} (hex), {@code signedAt}: thông tin bản đã ký mới nhất.
 */
public record AttachmentDto(Long id, String name, long sizeBytes, boolean signable, LocalDateTime uploadedAt,
                            boolean signed, @Nullable Long signedSizeBytes, @Nullable String signedSha256,
                            @Nullable LocalDateTime signedAt) {
    public static AttachmentDto of(Attachment a) {
        return new AttachmentDto(a.getId(), a.getOriginalName(), a.getSizeBytes(), a.isSignable(),
                a.getUploadedAt(), a.getSignedStoredName() != null, a.getSignedSizeBytes(), a.getSignedSha256(),
                a.getSignedAt());
    }
}
