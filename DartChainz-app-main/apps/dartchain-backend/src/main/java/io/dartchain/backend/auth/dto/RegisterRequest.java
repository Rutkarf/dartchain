package io.dartchain.backend.auth.dto;

import jakarta.validation.constraints.Email;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Pattern;
import jakarta.validation.constraints.Size;

public record RegisterRequest(
        @NotBlank
        @Size(min = 3, max = 32)
        @Pattern(regexp = "^[A-Za-z0-9_]+$", message = "must contain only letters, numbers and underscore")
        String username,

        @NotBlank
        @Email
        @Size(max = 120)
        String email,

        @NotBlank
        @Size(min = 8, max = 128)
        String password
) {
}
