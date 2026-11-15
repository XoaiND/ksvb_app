package vn.vbi.ksvb.signrequest.application;

import java.time.LocalDateTime;
import vn.vbi.ksvb.signrequest.domain.Participant;
import vn.vbi.ksvb.signrequest.domain.SignerStatus;
import vn.vbi.ksvb.user.domain.AppUser;

public record ParticipantDto(Long userId, String fullName, String jobTitle, String unitName, int orderNo,
                             SignerStatus status, LocalDateTime signedAt, String note) {
    public static ParticipantDto of(Participant p) {
        AppUser u = p.getUser();
        return new ParticipantDto(u.getId(), u.getFullName(), u.getJobTitle(), u.getUnitName(), p.getOrderNo(),
                p.getStatus(), p.getSignedAt(), p.getNote());
    }
}
