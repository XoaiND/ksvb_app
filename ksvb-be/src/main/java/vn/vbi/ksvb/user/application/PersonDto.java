package vn.vbi.ksvb.user.application;

import vn.vbi.ksvb.user.domain.AppUser;
import vn.vbi.ksvb.user.domain.UserRole;

public record PersonDto(Long id, String fullName, String email, String unitName, String jobTitle, UserRole role,
                        boolean active) {
    public static PersonDto of(AppUser u) {
        return new PersonDto(u.getId(), u.getFullName(), u.getEmail(), u.getUnitName(), u.getJobTitle(),
                u.getRole(), u.isActive());
    }
}
