package io.dartchain.backend.exchange.dto;

public record CryptoSearchResult(
        String id,
        String symbol,
        String name,
        String thumb,
        String source,
        String network
) {}
