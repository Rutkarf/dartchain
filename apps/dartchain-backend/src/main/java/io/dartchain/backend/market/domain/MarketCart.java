package io.dartchain.backend.market.domain;

import java.math.BigDecimal;
import java.time.Instant;
import java.util.ArrayList;
import java.util.List;

public class MarketCart {

    private final String id;
    private final String userId;
    private Instant updatedAt;
    private final List<MarketCartItem> items;

    public MarketCart(String id, String userId, Instant updatedAt, List<MarketCartItem> items) {
        this.id = id;
        this.userId = userId;
        this.updatedAt = updatedAt;
        this.items = new ArrayList<>(items == null ? List.of() : items);
    }

    public String getId() {
        return id;
    }

    public String getUserId() {
        return userId;
    }

    public Instant getUpdatedAt() {
        return updatedAt;
    }

    public void setUpdatedAt(Instant updatedAt) {
        this.updatedAt = updatedAt;
    }

    public List<MarketCartItem> getItems() {
        return List.copyOf(items);
    }

    public void replaceItems(List<MarketCartItem> next) {
        items.clear();
        if (next != null) {
            items.addAll(next);
        }
        updatedAt = Instant.now();
    }

    public int itemCount() {
        return items.stream().mapToInt(MarketCartItem::quantity).sum();
    }

    public BigDecimal totalR4v3() {
        return items.stream()
                .map(MarketCartItem::lineTotal)
                .reduce(BigDecimal.ZERO, BigDecimal::add);
    }
}
