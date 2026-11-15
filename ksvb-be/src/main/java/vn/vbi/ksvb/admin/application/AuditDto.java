package vn.vbi.ksvb.admin.application;

import java.time.LocalDateTime;

public record AuditDto(Long id, LocalDateTime at, String actor, String action, String target, String detail) {}
