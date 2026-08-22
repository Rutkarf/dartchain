package io.dartchain.backend.showcase.dto;

public record BannerResponse(
        String message1,
        String lastTransaction,
        String lastTransactionShort,
        int userCount
) {}