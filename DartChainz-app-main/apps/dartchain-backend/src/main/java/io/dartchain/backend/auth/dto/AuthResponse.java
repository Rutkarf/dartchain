package io.dartchain.backend.auth.dto;

public record AuthResponse(
        String token,
        UserProfileResponse user
) {
}
