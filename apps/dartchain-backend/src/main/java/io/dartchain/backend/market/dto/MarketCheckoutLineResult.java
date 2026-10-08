package io.dartchain.backend.market.dto;

import java.math.BigDecimal;

public record MarketCheckoutLineResult(
        String exchangeToken,
        int quantity,
        BigDecimal amountInR4v3,
        BigDecimal amountOut,
        boolean ok,
        String message
) {}
