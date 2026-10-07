package io.dartchain.backend.market.application;

import io.dartchain.backend.market.domain.MarketCart;
import io.dartchain.backend.market.domain.MarketCartItem;
import io.dartchain.backend.market.domain.MarketOrder;
import io.dartchain.backend.market.domain.MarketOrderLine;
import io.dartchain.backend.persistence.entity.MarketCartEntity;
import io.dartchain.backend.persistence.entity.MarketCartItemEntity;
import io.dartchain.backend.persistence.entity.MarketOrderEntity;
import io.dartchain.backend.persistence.entity.MarketOrderItemEntity;
import io.dartchain.backend.persistence.repository.MarketCartJpaRepository;
import io.dartchain.backend.persistence.repository.MarketOrderJpaRepository;
import org.springframework.boot.autoconfigure.condition.ConditionalOnProperty;
import org.springframework.stereotype.Component;
import org.springframework.transaction.annotation.Transactional;

import java.time.Instant;
import java.util.ArrayList;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;
import java.util.Optional;
import java.util.UUID;

@Component
@ConditionalOnProperty(name = "dartchain.persistence.mode", havingValue = "postgres")
public class JpaMarketCartStore implements MarketCartStore {

    private final MarketCartJpaRepository cartRepository;
    private final MarketOrderJpaRepository orderRepository;

    public JpaMarketCartStore(
            MarketCartJpaRepository cartRepository,
            MarketOrderJpaRepository orderRepository
    ) {
        this.cartRepository = cartRepository;
        this.orderRepository = orderRepository;
    }

    @Override
    @Transactional
    public MarketCart getOrCreate(String userId) {
        return toDomain(loadOrCreateEntity(userId));
    }

    @Override
    @Transactional
    public MarketCart replaceItems(String userId, List<MarketCartItem> items) {
        MarketCartEntity entity = loadOrCreateEntity(userId);
        entity.getItems().clear();
        for (MarketCartItem item : dedupe(items)) {
            MarketCartItemEntity line = new MarketCartItemEntity();
            line.setId(UUID.randomUUID().toString());
            line.setCart(entity);
            line.setExchangeToken(item.exchangeToken());
            line.setDisplaySymbol(item.displaySymbol());
            line.setName(item.name());
            line.setOfferKind(item.offerKind());
            line.setQuantity(item.quantity());
            line.setUnitPriceR4v3(item.unitPriceR4v3());
            entity.getItems().add(line);
        }
        entity.setUpdatedAt(Instant.now());
        return toDomain(cartRepository.save(entity));
    }

    @Override
    @Transactional(readOnly = true)
    public Optional<MarketCart> findByUserId(String userId) {
        return cartRepository.findByUserId(userId).map(this::toDomain);
    }

    @Override
    @Transactional
    public MarketOrder saveOrder(MarketOrder order) {
        MarketOrderEntity entity = new MarketOrderEntity();
        entity.setId(order.id());
        entity.setUserId(order.userId());
        entity.setWalletAddress(order.walletAddress());
        entity.setStatus(order.status());
        entity.setTotalR4v3(order.totalR4v3());
        entity.setMessage(order.message());
        entity.setCreatedAt(order.createdAt());
        List<MarketOrderItemEntity> lines = new ArrayList<>();
        for (MarketOrderLine line : order.lines()) {
            MarketOrderItemEntity item = new MarketOrderItemEntity();
            item.setId(UUID.randomUUID().toString());
            item.setOrder(entity);
            item.setExchangeToken(line.exchangeToken());
            item.setDisplaySymbol(line.displaySymbol());
            item.setQuantity(line.quantity());
            item.setUnitPriceR4v3(line.unitPriceR4v3());
            item.setAmountInR4v3(line.amountInR4v3());
            item.setAmountOut(line.amountOut());
            item.setOk(line.ok());
            item.setLineMessage(line.lineMessage());
            lines.add(item);
        }
        entity.setItems(lines);
        orderRepository.save(entity);
        return order;
    }

    private MarketCartEntity loadOrCreateEntity(String userId) {
        return cartRepository.findByUserId(userId).orElseGet(() -> {
            MarketCartEntity created = new MarketCartEntity();
            created.setId(UUID.randomUUID().toString());
            created.setUserId(userId);
            created.setUpdatedAt(Instant.now());
            return cartRepository.save(created);
        });
    }

    private MarketCart toDomain(MarketCartEntity entity) {
        List<MarketCartItem> items = entity.getItems().stream()
                .map(line -> new MarketCartItem(
                        line.getExchangeToken(),
                        line.getDisplaySymbol(),
                        line.getName(),
                        line.getOfferKind(),
                        line.getQuantity(),
                        line.getUnitPriceR4v3()
                ))
                .toList();
        return new MarketCart(entity.getId(), entity.getUserId(), entity.getUpdatedAt(), items);
    }

    private static List<MarketCartItem> dedupe(List<MarketCartItem> items) {
        if (items == null || items.isEmpty()) {
            return List.of();
        }
        Map<String, MarketCartItem> merged = new LinkedHashMap<>();
        for (MarketCartItem item : items) {
            if (item == null || "R4V3".equalsIgnoreCase(item.exchangeToken())) {
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
