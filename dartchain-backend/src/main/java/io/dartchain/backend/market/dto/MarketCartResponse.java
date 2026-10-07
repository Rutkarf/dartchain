package io.dartchain.backend.market.dto;

import java.math.BigDecimal;
import java.util.List;

public record MarketCartResponse(
        List<MarketCartItemDto> items,
        int itemCount,
        BigDecimal totalR4v3
) {}
