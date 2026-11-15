package vn.vbi.ksvb.signrequest.application;

import java.time.LocalDateTime;
import vn.vbi.ksvb.signrequest.domain.Attachment;

public record AttachmentDto(Long id, String name, long sizeBytes, boolean signable, LocalDateTime uploadedAt) {
    public static AttachmentDto of(Attachment a) {
        return new AttachmentDto(a.getId(), a.getOriginalName(), a.getSizeBytes(), a.isSignable(),
                a.getUploadedAt());
    }
}
