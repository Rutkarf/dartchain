package io.dartchain.backend.showcase.dto;

import java.util.List;

public record ChartResponse(
        String pair,
        String range,
        String currentPrice,
        double changePercent,
        boolean positive,
        String high,
        String low,
        String volume,
        List<ChartPointDto> points
) {}
