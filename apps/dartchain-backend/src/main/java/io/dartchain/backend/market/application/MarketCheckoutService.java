package io.dartchain.backend.market.application;

import io.dartchain.backend.auth.application.AuthService;
import io.dartchain.backend.auth.model.UserAccount;
import io.dartchain.backend.auth.security.AuthenticatedUser;
import io.dartchain.backend.exchange.application.ExchangeService;
import io.dartchain.backend.exchange.dto.ExchangeSwapRequest;
import io.dartchain.backend.exchange.dto.ExchangeSwapResponse;
import io.dartchain.backend.market.domain.MarketCartItem;
import io.dartchain.backend.market.domain.MarketOrder;
import io.dartchain.backend.market.domain.MarketOrderLine;
import io.dartchain.backend.market.dto.MarketCheckoutLineResult;
import io.dartchain.backend.market.dto.MarketCheckoutRequest;
import io.dartchain.backend.market.dto.MarketCheckoutResponse;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.web.server.ResponseStatusException;

import java.math.BigDecimal;
import java.math.RoundingMode;
import java.time.Instant;
import java.util.ArrayList;
import java.util.List;
import java.util.UUID;

@Service
public class MarketCheckoutService {

    private static final String NATIVE = "R4V3";
    private static final int SCALE = 8;

    private final MarketCartService cartService;
    private final MarketCartStore cartStore;
    private final ExchangeService exchangeService;
    private final AuthService authService;

    public MarketCheckoutService(
            MarketCartService cartService,
            MarketCartStore cartStore,
            ExchangeService exchangeService,
            AuthService authService
    ) {
        this.cartService = cartService;
        this.cartStore = cartStore;
        this.exchangeService = exchangeService;
        this.authService = authService;
    }

    public MarketCheckoutResponse checkout(
            AuthenticatedUser user,
            MarketCheckoutRequest request,
            String authorizationHeader
    ) {
        if (user == null) {
            throw new ResponseStatusException(HttpStatus.UNAUTHORIZED, "Authentication required");
        }
        if (request == null || request.walletAddress() == null || request.walletAddress().isBlank()) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "walletAddress is required");
        }

        UserAccount account = authService.requireAuthenticatedAccount(authorizationHeader);
        authService.ensureWalletOwnership(account, request.walletAddress());

        List<MarketCartItem> items = cartService.resolveCheckoutItems(user, request.items());
        if (items.isEmpty()) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Panier vide");
        }

        List<MarketCheckoutLineResult> lineResults = new ArrayList<>();
        List<MarketOrderLine> orderLines = new ArrayList<>();
        BigDecimal totalPaid = BigDecimal.ZERO;
        boolean allOk = true;

        for (MarketCartItem item : items) {
            BigDecimal amountIn = item.lineTotal().setScale(SCALE, RoundingMode.HALF_UP);
            if (amountIn.signum() <= 0) {
                // Fallback: 1 token costs at least a tiny amount
                amountIn = BigDecimal.valueOf(item.quantity()).multiply(new BigDecimal("0.05"));
            }
            try {
                ExchangeSwapResponse swap = exchangeService.swap(
                        new ExchangeSwapRequest(
                                NATIVE,
                                item.exchangeToken(),
                                amountIn,
                                request.walletAddress()
                        ),
                        authorizationHeader
                );
                totalPaid = totalPaid.add(swap.amountIn());
                lineResults.add(new MarketCheckoutLineResult(
                        item.exchangeToken(),
                        item.quantity(),
                        swap.amountIn(),
                        swap.amountOut(),
                        true,
                        null
                ));
                orderLines.add(new MarketOrderLine(
                        item.exchangeToken(),
                        item.displaySymbol(),
                        item.quantity(),
                        item.unitPriceR4v3(),
                        swap.amountIn(),
                        swap.amountOut(),
                        true,
                        null
                ));
            } catch (RuntimeException ex) {
                allOk = false;
                String message = ex.getMessage() == null ? "Swap failed" : ex.getMessage();
                lineResults.add(new MarketCheckoutLineResult(
                        item.exchangeToken(),
                        item.quantity(),
                        amountIn,
                        BigDecimal.ZERO,
                        false,
                        message
                ));
                orderLines.add(new MarketOrderLine(
                        item.exchangeToken(),
                        item.displaySymbol(),
                        item.quantity(),
                        item.unitPriceR4v3(),
                        amountIn,
                        BigDecimal.ZERO,
                        false,
                        message
                ));
                break;
            }
        }

        String status = allOk ? "PAID" : "FAILED";
        String message = allOk
                ? "Commande payée · " + totalPaid.toPlainString() + " R4V3"
                : "Checkout interrompu — " + lineResults.get(lineResults.size() - 1).message();

        MarketOrder order = new MarketOrder(
                UUID.randomUUID().toString(),
                user.getId(),
                request.walletAddress(),
                status,
                totalPaid,
                message,
                Instant.now(),
                orderLines
        );
        cartStore.saveOrder(order);

        if (allOk) {
            var paidTokens = items.stream().map(MarketCartItem::exchangeToken).collect(java.util.stream.Collectors.toSet());
            var remaining = cartStore.getOrCreate(user.getId()).getItems().stream()
                    .filter(line -> !paidTokens.contains(line.exchangeToken()))
                    .toList();
            cartStore.replaceItems(user.getId(), remaining);
        }

        return new MarketCheckoutResponse(order.id(), status, totalPaid, lineResults, message);
    }
}
