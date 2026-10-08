package io.dartchain.backend.auth.dto;

import jakarta.validation.constraints.NotBlank;

public record EmailResendRequest(@NotBlank String verificationId) {
}
