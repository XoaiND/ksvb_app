package vn.vbi.ksvb.admin.application;

import java.time.LocalDateTime;
import org.jspecify.annotations.Nullable;

public record AuditDto(Long id, LocalDateTime at, String actor, String action, @Nullable String target, @Nullable String detail,
                       String result) {}
