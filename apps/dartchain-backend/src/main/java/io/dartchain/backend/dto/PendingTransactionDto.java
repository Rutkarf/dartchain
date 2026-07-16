package io.dartchain.backend.dto;

public record PendingTransactionDto(
        String id,
        String hash,
        String data,
        long createdAt
) {}