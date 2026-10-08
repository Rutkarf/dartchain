package io.dartchain.backend.market.dto;

import java.math.BigDecimal;
import java.util.List;

public record MarketCheckoutResponse(
        String orderId,
        String status,
        BigDecimal totalR4v3,
        List<MarketCheckoutLineResult> lines,
        String message
) {}
