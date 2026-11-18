package ksvb.user.application;

import ksvb.user.domain.AppUser;
import ksvb.user.domain.UserRole;
import org.jspecify.annotations.Nullable;

public record PersonDto(Long id, String fullName, String email, @Nullable String unitName, @Nullable String jobTitle,
                        @Nullable UserRole role,
                        boolean active) {
    public static PersonDto of(AppUser u) {
        return new PersonDto(u.getId(), u.getFullName(), u.getEmail(), u.getUnitName(), u.getJobTitle(),
                u.getRole(), u.isActive());
    }
}
