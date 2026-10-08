package io.dartchain.backend.auth.dto;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Pattern;

public record EmailCodeRequest(
        @NotBlank String verificationId,
        @NotBlank @Pattern(regexp = "\\d{6}") String code
) {
}
