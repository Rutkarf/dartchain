package io.dartchain.backend.auth.dto;

public record AuthResponse(
        String token,
        String accessToken,
        String refreshToken,
        long expiresIn,
        String tokenType,
        UserProfileResponse user
) {
}