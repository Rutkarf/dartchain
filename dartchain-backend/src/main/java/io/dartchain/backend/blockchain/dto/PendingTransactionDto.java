package io.dartchain.backend.blockchain.dto;

public record PendingTransactionDto(
        String id,
        String hash,
        String data,
        long createdAt
) {}