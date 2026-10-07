package io.dartchain.backend.exchange.dto;

import java.math.BigDecimal;

public record ExchangeSwapResponse(
        String fromToken,
        String toToken,
        BigDecimal rate,
        BigDecimal amountIn,
        BigDecimal amountOut,
        BigDecimal fromBalance,
        BigDecimal toBalance,
        String message
) {}