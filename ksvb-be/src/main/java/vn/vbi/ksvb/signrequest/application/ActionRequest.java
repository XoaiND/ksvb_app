package vn.vbi.ksvb.signrequest.application;

import jakarta.validation.constraints.Size;

/** Ghi chú khi ký / lý do khi từ chối hoặc huỷ. */
public record ActionRequest(@Size(max = 500, message = "Tối đa 500 ký tự") String note) {}
