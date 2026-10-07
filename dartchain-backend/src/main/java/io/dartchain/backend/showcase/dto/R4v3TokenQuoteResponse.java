package io.dartchain.backend.showcase.dto;

public record R4v3TokenQuoteResponse(
        String symbol,
        String priceVsR4v3,
        String change,
        boolean positive
) {}
