package vn.vbi.ksvb.admin.application;


/** Chỉ bật/tắt tài khoản; phân quyền (role) làm ở Keycloak. */
public record UpdateUser(Boolean active) {}
