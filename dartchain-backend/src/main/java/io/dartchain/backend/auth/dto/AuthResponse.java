package io.dartchain.backend.auth.dto;

public record AuthResponse(
        String token,
        String accessToken,
        String refreshToken,
        long expiresIn,
        String tokenType,
        UserProfileResponse user,
        String status,
        String verificationId,
        String challengeToken
) {
    public AuthResponse(
            String token,
            String accessToken,
            String refreshToken,
            long expiresIn,
            String tokenType,
            UserProfileResponse user
    ) {
        this(token, accessToken, refreshToken, expiresIn, tokenType, user, "AUTHENTICATED", null, null);
    }

    public static AuthResponse emailVerification(String verificationId, UserProfileResponse user) {
        return new AuthResponse(null, null, null, 0, null, user, "EMAIL_VERIFICATION", verificationId, null);
    }

    public static AuthResponse twoFactor(String challengeToken, UserProfileResponse user) {
        return new AuthResponse(null, null, null, 0, null, user, "TWO_FACTOR", null, challengeToken);
    }
}