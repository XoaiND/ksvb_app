package vn.vbi.ksvb.admin.application;

import org.jspecify.annotations.Nullable;


/** Chỉ bật/tắt tài khoản; phân quyền (role) làm ở Keycloak. */
public record UpdateUser(@Nullable Boolean active) {}
