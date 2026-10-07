package io.dartchain.backend.market.dto;

import java.math.BigDecimal;

public record MarketCartItemDto(
        String exchangeToken,
        String displaySymbol,
        String name,
        String offerKind,
        int quantity,
        BigDecimal unitPriceR4v3
) {}
