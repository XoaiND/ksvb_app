package vn.vbi.ksvb.signrequest.application;

import java.time.LocalDateTime;
import org.jspecify.annotations.Nullable;
import vn.vbi.ksvb.signrequest.domain.Participant;
import vn.vbi.ksvb.signrequest.domain.SignerStatus;
import vn.vbi.ksvb.user.domain.AppUser;

public record ParticipantDto(Long userId, String fullName, @Nullable String jobTitle, @Nullable String unitName,
                             int orderNo, SignerStatus status, @Nullable LocalDateTime signedAt, @Nullable String note) {
    public static ParticipantDto of(Participant p) {
        AppUser u = p.getUser();
        return new ParticipantDto(u.getId(), u.getFullName(), u.getJobTitle(), u.getUnitName(), p.getOrderNo(),
                p.getStatus(), p.getSignedAt(), p.getNote());
    }
}
