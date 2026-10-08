package io.dartchain.backend.market.domain;

import java.math.BigDecimal;

public record MarketOrderLine(
        String exchangeToken,
        String displaySymbol,
        int quantity,
        BigDecimal unitPriceR4v3,
        BigDecimal amountInR4v3,
        BigDecimal amountOut,
        boolean ok,
        String lineMessage
) {}
