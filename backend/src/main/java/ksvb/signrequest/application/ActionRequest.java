package ksvb.signrequest.application;

import jakarta.validation.constraints.Size;
import org.jspecify.annotations.Nullable;

/**
 * Ghi chú khi ký / lý do khi từ chối hoặc huỷ. {@code showCaption} (chỉ khi ký): ghi họ tên và thời gian ký dưới ảnh
 * chữ ký trong PDF (mặc định có).
 */
public record ActionRequest(@Size(max = 500, message = "Tối đa 500 ký tự") @Nullable String note,
                            @Nullable Boolean showCaption) {}
