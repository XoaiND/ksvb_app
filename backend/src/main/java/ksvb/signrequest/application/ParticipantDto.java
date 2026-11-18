package ksvb.signrequest.application;

import java.time.LocalDateTime;
import ksvb.signrequest.domain.Participant;
import ksvb.signrequest.domain.SignerStatus;
import ksvb.user.domain.AppUser;
import org.jspecify.annotations.Nullable;

public record ParticipantDto(Long userId, String fullName, @Nullable String jobTitle, @Nullable String unitName,
                             int orderNo, SignerStatus status, @Nullable LocalDateTime signedAt, @Nullable String note) {
    public static ParticipantDto of(Participant p) {
        AppUser u = p.getUser();
        return new ParticipantDto(u.getId(), u.getFullName(), u.getJobTitle(), u.getUnitName(), p.getOrderNo(),
                p.getStatus(), p.getSignedAt(), p.getNote());
    }
}
