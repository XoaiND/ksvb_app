package ksvb.signrequest.application;

import org.jspecify.annotations.Nullable;

/** Ảnh chữ ký (data URL PNG) của một người trong luồng ký; null = người đó chưa tải ảnh chữ ký. */
public record SignerSignatureDto(Long userId, @Nullable String imageDataUrl) {}
