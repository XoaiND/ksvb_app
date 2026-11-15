package vn.vbi.ksvb.signrequest.application;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotEmpty;
import jakarta.validation.constraints.Size;
import java.time.LocalDate;
import java.util.List;
import vn.vbi.ksvb.signrequest.domain.Priority;
import vn.vbi.ksvb.signrequest.domain.SignMode;

public record SaveSignRequest(
        @NotBlank(message = "Tiêu đề không được để trống") @Size(max = 250, message = "Tiêu đề tối đa 250 ký tự")
        String title,
        @NotBlank(message = "Loại văn bản không được để trống") @Size(max = 60) String docType,
        @Size(max = 500, message = "Mô tả tối đa 500 ký tự") String description,
        Priority priority,
        SignMode mode,
        LocalDate deadline,
        @Size(max = 500, message = "Lời nhắn tối đa 500 ký tự") String message,
        Boolean shared,
        @NotEmpty(message = "Cần ít nhất một người ký") List<Long> signerIds,
        List<Long> watcherIds) {}
