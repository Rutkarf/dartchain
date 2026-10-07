package io.dartchain.backend.exchange.dto;

import java.math.BigDecimal;

public record ExchangeSwapRequest(
        String fromToken,
        String toToken,
        BigDecimal amount,
        String walletAddress
) {}