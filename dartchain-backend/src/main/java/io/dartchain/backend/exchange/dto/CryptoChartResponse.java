package io.dartchain.backend.exchange.dto;

import java.util.List;

public record CryptoChartResponse(
        String symbol,
        String range,
        String currency,
        String currentPrice,
        double changePercent,
        boolean positive,
        String high,
        String low,
        String volume,
        List<Double> points,
        List<Double> volumes,
        List<Double> prices,
        List<Long> timestamps
) {}
