package vn.vbi.ksvb.signrequest.application;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotEmpty;
import jakarta.validation.constraints.Size;
import java.time.LocalDate;
import java.util.List;
import org.jspecify.annotations.Nullable;
import vn.vbi.ksvb.signrequest.domain.Priority;
import vn.vbi.ksvb.signrequest.domain.SignMode;

public record SaveSignRequest(
        @NotBlank(message = "Tiêu đề không được để trống") @Size(max = 250, message = "Tiêu đề tối đa 250 ký tự")
        String title,
        @NotBlank(message = "Loại văn bản không được để trống") @Size(max = 60) String docType,
        @Size(max = 500, message = "Mô tả tối đa 500 ký tự") @Nullable String description,
        @Nullable Priority priority,
        @Nullable SignMode mode,
        @Nullable LocalDate deadline,
        @Size(max = 500, message = "Lời nhắn tối đa 500 ký tự") @Nullable String message,
        @Nullable Boolean shared,
        @NotEmpty(message = "Cần ít nhất một người ký") List<Long> signerIds,
        @Nullable List<Long> watcherIds) {}
