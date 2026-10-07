package io.dartchain.backend.showcase.dto;

import io.dartchain.backend.exchange.dto.CryptoRatePanelResponse;

import java.util.List;

public record R4v3ShowcaseResponse(
        CryptoRatePanelResponse panel,
        NewsFeedResponse news,
        List<R4v3TokenQuoteResponse> launchTokens,
        R4v3SwapStatsResponse swapStats,
        long ratesLatencyMs,
        String lastRefreshedAt
) {}
