package io.dartchain.backend.market.application;

import io.dartchain.backend.market.domain.MarketCart;
import io.dartchain.backend.market.domain.MarketCartItem;
import io.dartchain.backend.market.domain.MarketOrder;

import java.util.List;
import java.util.Optional;

public interface MarketCartStore {

    MarketCart getOrCreate(String userId);

    MarketCart replaceItems(String userId, List<MarketCartItem> items);

    Optional<MarketCart> findByUserId(String userId);

    MarketOrder saveOrder(MarketOrder order);
}
