package io.dartchain.backend.auth.dto;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;

public record LinkWalletRequest(
        @NotBlank
        @Size(min = 40, max = 128)
        String walletAddress,

        @NotBlank
        String publicKey
) {
}
