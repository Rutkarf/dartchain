package io.dartchain.backend.auth.dto;

public record UserProfileResponse(
        String id,
        String username,
        String email,
        long createdAt,
        String walletAddress,
        String walletPublicKey,
        String role
) {
}