package io.dartchain.backend.market.domain;

import java.math.BigDecimal;
import java.time.Instant;
import java.util.List;

public record MarketOrder(
        String id,
        String userId,
        String walletAddress,
        String status,
        BigDecimal totalR4v3,
        String message,
        Instant createdAt,
        List<MarketOrderLine> lines
) {}
