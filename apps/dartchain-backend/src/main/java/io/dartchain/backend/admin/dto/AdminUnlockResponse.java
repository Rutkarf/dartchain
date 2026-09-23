package io.dartchain.backend.admin.dto;

public record AdminUnlockResponse(
        boolean success,
        String unlockToken,
        long expiresAtEpochMs,
        long ttlSeconds,
        String message
) {
}
