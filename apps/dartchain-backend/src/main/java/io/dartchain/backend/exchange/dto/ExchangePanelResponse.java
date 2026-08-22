package io.dartchain.backend.exchange.dto;

import java.math.BigDecimal;
import java.util.List;

public record ExchangePanelResponse(
        String fromToken,
        String toToken,
        List<String> availableTokens,
        BigDecimal fromBalance,
        BigDecimal toBalance,
        BigDecimal rate,
        boolean testnet
) {}