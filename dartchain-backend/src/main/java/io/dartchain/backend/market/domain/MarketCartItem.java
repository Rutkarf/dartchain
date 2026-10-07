package io.dartchain.backend.market.domain;

import java.math.BigDecimal;

public record MarketCartItem(
        String exchangeToken,
        String displaySymbol,
        String name,
        String offerKind,
        int quantity,
        BigDecimal unitPriceR4v3
) {
    public MarketCartItem {
        if (exchangeToken == null || exchangeToken.isBlank()) {
            throw new IllegalArgumentException("exchangeToken required");
        }
        if (quantity <= 0) {
            throw new IllegalArgumentException("quantity must be positive");
        }
        if (unitPriceR4v3 == null || unitPriceR4v3.signum() < 0) {
            throw new IllegalArgumentException("unitPriceR4v3 must be >= 0");
        }
        exchangeToken = exchangeToken.trim().toUpperCase();
        displaySymbol = displaySymbol == null || displaySymbol.isBlank() ? exchangeToken : displaySymbol.trim();
        name = name == null || name.isBlank() ? displaySymbol : name.trim();
        offerKind = offerKind == null || offerKind.isBlank() ? "asset" : offerKind.trim().toLowerCase();
    }

    public BigDecimal lineTotal() {
        return unitPriceR4v3.multiply(BigDecimal.valueOf(quantity));
    }
}
