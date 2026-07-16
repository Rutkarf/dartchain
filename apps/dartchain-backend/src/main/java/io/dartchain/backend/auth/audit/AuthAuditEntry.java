package io.dartchain.backend.auth.audit;

public record AuthAuditEntry(
        String userId,
        String action,
        String detail,
        String ipAddress,
        long createdAtEpochMs
) {
}
