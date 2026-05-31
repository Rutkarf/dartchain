package io.dartchain.backend.dto;

import java.util.List;

public record CryptoRatePanelResponse(
        String symbol,
        String pair,
        String value,
        String change,
        boolean positive,
        List<Double> points
) {}
