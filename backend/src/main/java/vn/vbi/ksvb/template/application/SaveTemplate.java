package vn.vbi.ksvb.template.application;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotEmpty;
import jakarta.validation.constraints.Size;
import java.util.List;
import vn.vbi.ksvb.signrequest.domain.SignMode;

public record SaveTemplate(@NotBlank(message = "Tên mẫu không được để trống") @Size(max = 150) String name,
                           SignMode mode,
                           @NotEmpty(message = "Cần ít nhất một người ký") List<Long> signerIds) {}
