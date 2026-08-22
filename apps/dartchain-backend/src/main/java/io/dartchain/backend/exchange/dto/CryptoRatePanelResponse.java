package io.dartchain.backend.exchange.dto;

import java.util.List;

public record CryptoRatePanelResponse(
        String symbol,
        String pair,
        String value,
        String change,
        boolean positive,
        List<Double> points
) {}
