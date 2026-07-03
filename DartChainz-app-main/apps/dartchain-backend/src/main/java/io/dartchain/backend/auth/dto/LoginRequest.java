package io.dartchain.backend.auth.dto;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;

public record LoginRequest(
        @NotBlank
        @Size(min = 3, max = 120)
        String identifier,

        @NotBlank
        @Size(min = 8, max = 128)
        String password
) {
}
