package io.dartchain.backend.market.infrastructure.web;

import io.dartchain.backend.auth.security.AuthenticatedUser;
import io.dartchain.backend.market.application.MarketCartService;
import io.dartchain.backend.market.application.MarketCheckoutService;
import io.dartchain.backend.market.dto.MarketCartReplaceRequest;
import io.dartchain.backend.market.dto.MarketCartResponse;
import io.dartchain.backend.market.dto.MarketCheckoutRequest;
import io.dartchain.backend.market.dto.MarketCheckoutResponse;
import org.springframework.http.HttpStatus;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.DeleteMapping;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.PutMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestHeader;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.ResponseStatus;
import org.springframework.web.bind.annotation.RestController;
import org.springframework.web.server.ResponseStatusException;

@RestController
@RequestMapping("/api/market")
public class MarketCartController {

    private final MarketCartService cartService;
    private final MarketCheckoutService checkoutService;

    public MarketCartController(MarketCartService cartService, MarketCheckoutService checkoutService) {
        this.cartService = cartService;
        this.checkoutService = checkoutService;
    }

    @GetMapping("/cart")
    public MarketCartResponse getCart(@AuthenticationPrincipal AuthenticatedUser user) {
        return cartService.getCart(require(user));
    }

    @PutMapping("/cart")
    public MarketCartResponse replaceCart(
            @AuthenticationPrincipal AuthenticatedUser user,
            @RequestBody(required = false) MarketCartReplaceRequest body
    ) {
        return cartService.replaceCart(require(user), body == null ? null : body.items());
    }

    @DeleteMapping("/cart")
    public MarketCartResponse clearCart(@AuthenticationPrincipal AuthenticatedUser user) {
        return cartService.clearCart(require(user));
    }

    @PostMapping("/checkout")
    @ResponseStatus(HttpStatus.OK)
    public MarketCheckoutResponse checkout(
            @AuthenticationPrincipal AuthenticatedUser user,
            @RequestBody MarketCheckoutRequest body,
            @RequestHeader(value = "Authorization", required = false) String authorization
    ) {
        return checkoutService.checkout(require(user), body, authorization);
    }

    private static AuthenticatedUser require(AuthenticatedUser user) {
        if (user == null) {
            throw new ResponseStatusException(HttpStatus.UNAUTHORIZED, "Authentication required");
        }
        return user;
    }
}
