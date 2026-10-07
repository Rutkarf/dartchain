package io.dartchain.backend.market.application;

import io.dartchain.backend.market.domain.MarketCart;
import io.dartchain.backend.market.domain.MarketCartItem;
import io.dartchain.backend.market.domain.MarketOrder;
import org.springframework.boot.autoconfigure.condition.ConditionalOnProperty;
import org.springframework.stereotype.Component;

import java.time.Instant;
import java.util.ArrayList;
import java.util.List;
import java.util.Map;
import java.util.Optional;
import java.util.UUID;
import java.util.concurrent.ConcurrentHashMap;

@Component
@ConditionalOnProperty(name = "dartchain.persistence.mode", havingValue = "memory", matchIfMissing = true)
public class InMemoryMarketCartStore implements MarketCartStore {

    private final Map<String, MarketCart> cartsByUser = new ConcurrentHashMap<>();
    private final List<MarketOrder> orders = new ArrayList<>();

    @Override
    public MarketCart getOrCreate(String userId) {
        return cartsByUser.computeIfAbsent(
                userId,
                id -> new MarketCart(UUID.randomUUID().toString(), id, Instant.now(), List.of())
        );
    }

    @Override
    public MarketCart replaceItems(String userId, List<MarketCartItem> items) {
        MarketCart cart = getOrCreate(userId);
        cart.replaceItems(dedupe(items));
        return cart;
    }

    @Override
    public Optional<MarketCart> findByUserId(String userId) {
        return Optional.ofNullable(cartsByUser.get(userId));
    }

    @Override
    public synchronized MarketOrder saveOrder(MarketOrder order) {
        orders.add(order);
        return order;
    }

    private static List<MarketCartItem> dedupe(List<MarketCartItem> items) {
        if (items == null || items.isEmpty()) {
            return List.of();
        }
        Map<String, MarketCartItem> merged = new ConcurrentHashMap<>();
        for (MarketCartItem item : items) {
            if (item == null) {
                continue;
            }
            if ("R4V3".equalsIgnoreCase(item.exchangeToken())) {
                continue;
            }
            merged.merge(
                    item.exchangeToken(),
                    item,
                    (a, b) -> new MarketCartItem(
                            a.exchangeToken(),
                            b.displaySymbol(),
                            b.name(),
                            b.offerKind(),
                            a.quantity() + b.quantity(),
                            b.unitPriceR4v3()
                    )
            );
        }
        return List.copyOf(merged.values());
    }
}
