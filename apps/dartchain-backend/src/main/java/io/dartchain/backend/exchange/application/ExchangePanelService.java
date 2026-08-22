package io.dartchain.backend.exchange.application;

import io.dartchain.backend.exchange.dto.ExchangePanelResponse;
import io.dartchain.backend.exchange.dto.ExchangeSwapResponse;
import org.springframework.stereotype.Service;

import java.math.BigDecimal;
import java.util.List;

@Service
public class ExchangePanelService {

    public ExchangePanelResponse getPanel() {
        return new ExchangePanelResponse(
                "R4V3",
                "CHF",
                List.of("R4V3", "CHF"),
                BigDecimal.ONE,
                BigDecimal.ONE,
                resolveRate("R4V3", "CHF"),
                true
        );
    }

    public ExchangeSwapResponse swap(String fromToken, String toToken) {
        BigDecimal rate = resolveRate(fromToken, toToken);
        return new ExchangeSwapResponse(
                fromToken,
                toToken,
                rate,
                BigDecimal.ONE,
                rate,
                BigDecimal.ZERO,
                BigDecimal.ZERO,
                "Swap démo"
        );
    }

    private BigDecimal resolveRate(String fromToken, String toToken) {
        if (fromToken == null || toToken == null) {
            throw new IllegalArgumentException("Tokens are required");
        }

        if (fromToken.equalsIgnoreCase(toToken)) {
            return BigDecimal.ONE;
        }

        if (
                ("R4V3".equalsIgnoreCase(fromToken) && "CHF".equalsIgnoreCase(toToken)) ||
                        ("CHF".equalsIgnoreCase(fromToken) && "R4V3".equalsIgnoreCase(toToken))
        ) {
            return BigDecimal.ONE;
        }

        throw new IllegalArgumentException("Unsupported pair: " + fromToken + "/" + toToken);
    }
}