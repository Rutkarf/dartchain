package io.dartchain.backend.auth.jwt;

public record JwtClaims(
        String subject,
        String role,
        long issuedAtEpochSeconds,
        long expiresAtEpochSeconds,
        String tokenId
) {
}
