package io.dartchain.backend.dto;

public record BannerResponse(
        String message1,
        String lastTransaction,
        String lastTransactionShort,
        int userCount
) {}