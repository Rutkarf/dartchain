package io.dartchain.backend.market.application;

import io.dartchain.backend.auth.security.AuthenticatedUser;
import io.dartchain.backend.market.domain.MarketCart;
import io.dartchain.backend.market.domain.MarketCartItem;
import io.dartchain.backend.market.dto.MarketCartItemDto;
import io.dartchain.backend.market.dto.MarketCartResponse;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.web.server.ResponseStatusException;

import java.math.BigDecimal;
import java.util.ArrayList;
import java.util.List;

@Service
public class MarketCartService {

    private final MarketCartStore cartStore;

    public MarketCartService(MarketCartStore cartStore) {
        this.cartStore = cartStore;
    }

    public MarketCartResponse getCart(AuthenticatedUser user) {
        requireUser(user);
        return toResponse(cartStore.getOrCreate(user.getId()));
    }

    public MarketCartResponse replaceCart(AuthenticatedUser user, List<MarketCartItemDto> items) {
        requireUser(user);
        List<MarketCartItem> domain = mapItems(items);
        return toResponse(cartStore.replaceItems(user.getId(), domain));
    }

    public MarketCartResponse clearCart(AuthenticatedUser user) {
        requireUser(user);
        return toResponse(cartStore.replaceItems(user.getId(), List.of()));
    }

    List<MarketCartItem> resolveCheckoutItems(AuthenticatedUser user, List<MarketCartItemDto> override) {
        requireUser(user);
        if (override != null && !override.isEmpty()) {
            return mapItems(override);
        }
        return cartStore.getOrCreate(user.getId()).getItems();
    }

    private static void requireUser(AuthenticatedUser user) {
        if (user == null || user.getId() == null || user.getId().isBlank()) {
            throw new ResponseStatusException(HttpStatus.UNAUTHORIZED, "Authentication required");
        }
    }

    private static List<MarketCartItem> mapItems(List<MarketCartItemDto> items) {
        if (items == null) {
            return List.of();
        }
        List<MarketCartItem> result = new ArrayList<>();
        for (MarketCartItemDto dto : items) {
            if (dto == null) {
                continue;
            }
            result.add(new MarketCartItem(
                    dto.exchangeToken(),
                    dto.displaySymbol(),
                    dto.name(),
                    dto.offerKind(),
                    dto.quantity(),
                    dto.unitPriceR4v3() == null ? BigDecimal.ZERO : dto.unitPriceR4v3()
            ));
        }
        return result;
    }

    private static MarketCartResponse toResponse(MarketCart cart) {
        List<MarketCartItemDto> items = cart.getItems().stream()
                .map(item -> new MarketCartItemDto(
                        item.exchangeToken(),
                        item.displaySymbol(),
                        item.name(),
                        item.offerKind(),
                        item.quantity(),
                        item.unitPriceR4v3()
                ))
                .toList();
        return new MarketCartResponse(items, cart.itemCount(), cart.totalR4v3());
    }
}
