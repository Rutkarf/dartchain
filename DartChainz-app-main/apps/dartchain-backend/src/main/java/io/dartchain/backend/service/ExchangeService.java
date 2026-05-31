package io.dartchain.backend.service;

import io.dartchain.backend.dto.CreatePendingTransactionRequest;
import io.dartchain.backend.dto.ExchangePanelResponse;
import io.dartchain.backend.dto.ExchangeSwapRequest;
import io.dartchain.backend.dto.ExchangeSwapResponse;
import io.dartchain.backend.exchange.ExchangeLedgerStore;
import io.dartchain.backend.showcase.service.NewsService;
import org.springframework.stereotype.Service;

import java.math.BigDecimal;
import java.math.RoundingMode;
import java.util.List;
import java.util.Locale;

@Service
public class ExchangeService {

    public static final String NATIVE_TOKEN = "R4V3";
    private static final List<String> TOKENS = List.of(
            NATIVE_TOKEN, "BTC", "ETH", "SOL", "DOGE", "SHIB", "XRP", "DOT", "USDT", "AVAX"
    );
    private static final int SCALE = 8;

    /** Crédit testnet à la première création wallet. */
    private static final BigDecimal WELCOME_BTC = new BigDecimal("0.001");
    private static final BigDecimal WELCOME_R4V3 = new BigDecimal("10");

    private final BlockchainService blockchainService;
    private final CryptoRatesProxyService cryptoRates;
    private final ExchangeLedgerStore ledgerStore;
    private final PendingTransactionService pendingTransactionService;
    private final NewsService newsService;

    public ExchangeService(
            BlockchainService blockchainService,
            CryptoRatesProxyService cryptoRates,
            ExchangeLedgerStore ledgerStore,
            PendingTransactionService pendingTransactionService,
            NewsService newsService
    ) {
        this.blockchainService = blockchainService;
        this.cryptoRates = cryptoRates;
        this.ledgerStore = ledgerStore;
        this.pendingTransactionService = pendingTransactionService;
        this.newsService = newsService;
    }

    public ExchangePanelResponse getPanel(String walletAddress, String fromToken, String toToken) {
        String from = normalizeToken(fromToken, "BTC");
        String to = normalizeToToken(from, toToken);

        return new ExchangePanelResponse(
                from,
                to,
                TOKENS,
                getEffectiveBalance(walletAddress, from),
                getEffectiveBalance(walletAddress, to),
                getRate(from, to),
                true
        );
    }

    public ExchangeSwapResponse swap(ExchangeSwapRequest request) {
        if (request == null) {
            throw new IllegalArgumentException("Request is required");
        }

        String walletAddress = request.walletAddress();
        if (walletAddress == null || walletAddress.isBlank()) {
            throw new IllegalArgumentException("walletAddress is required");
        }

        BigDecimal amount = request.amount();
        if (amount == null || amount.compareTo(BigDecimal.ZERO) <= 0) {
            throw new IllegalArgumentException("amount must be positive");
        }

        String fromToken = normalizeToken(request.fromToken(), null);
        String toToken = normalizeToken(request.toToken(), null);

        if (fromToken == null || toToken == null) {
            throw new IllegalArgumentException("fromToken and toToken are required");
        }

        if (fromToken.equalsIgnoreCase(toToken)) {
            throw new IllegalArgumentException("fromToken and toToken must differ");
        }

        BigDecimal fromBalance = getEffectiveBalance(walletAddress, fromToken);
        if (fromBalance.compareTo(amount) < 0) {
            throw new IllegalArgumentException("Insufficient balance");
        }

        BigDecimal rate = getRate(fromToken, toToken);
        BigDecimal amountOut = amount.multiply(rate).setScale(SCALE, RoundingMode.HALF_UP);

        ledgerStore.applyAdjustment(walletAddress, fromToken, amount.negate());
        ledgerStore.applyAdjustment(walletAddress, toToken, amountOut);

        ExchangeSwapResponse response = new ExchangeSwapResponse(
                fromToken,
                toToken,
                rate,
                amount.setScale(SCALE, RoundingMode.HALF_UP),
                amountOut,
                getEffectiveBalance(walletAddress, fromToken),
                getEffectiveBalance(walletAddress, toToken),
                "Swap testnet réussi : "
                        + formatAmount(amount)
                        + " "
                        + fromToken
                        + " → "
                        + formatAmount(amountOut)
                        + " "
                        + toToken
        );

        recordSwapTrace(walletAddress, response);
        newsService.publishSwapEvent(walletAddress, response);

        return response;
    }

  /**
   * Crédite les soldes testnet lors de la première création de wallet.
   * @return true si un crédit a été appliqué
   */
    public boolean seedWelcomeCredits(String walletAddress) {
        if (walletAddress == null || walletAddress.isBlank()) {
            return false;
        }

        if (!ledgerStore.markSeededIfAbsent(walletAddress)) {
            return false;
        }

        ledgerStore.applyAdjustment(walletAddress, "BTC", WELCOME_BTC);
        ledgerStore.applyAdjustment(walletAddress, NATIVE_TOKEN, WELCOME_R4V3);
        return true;
    }

    /** Solde R4V3 effectif (chaîne R4V3chainz + ajustements testnet). */
    public BigDecimal getEffectiveNativeBalance(String walletAddress) {
        return getEffectiveBalance(walletAddress, NATIVE_TOKEN);
    }

    private void recordSwapTrace(String walletAddress, ExchangeSwapResponse response) {
        CreatePendingTransactionRequest request = new CreatePendingTransactionRequest();
        request.setFromAddress(walletAddress);
        request.setToAddress("R4V3chainz-EXCHANGE");
        request.setAmount(response.amountIn());
        request.setData(
                "SWAP-TESTNET "
                        + response.fromToken()
                        + "→"
                        + response.toToken()
                        + " out="
                        + formatAmount(response.amountOut())
        );

        try {
            pendingTransactionService.addPendingTransaction(request);
        } catch (RuntimeException ignored) {
            // Ne pas bloquer le swap si la trace pending échoue (doublon, etc.).
        }
    }

    private BigDecimal getRate(String fromToken, String toToken) {
        BigDecimal fromEur = cryptoRates.getEurUnitPrice(fromToken);
        BigDecimal toEur = cryptoRates.getEurUnitPrice(toToken);

        if (toEur.compareTo(BigDecimal.ZERO) == 0) {
            throw new IllegalArgumentException("Invalid rate for " + toToken);
        }

        return fromEur.divide(toEur, SCALE, RoundingMode.HALF_UP);
    }

    private BigDecimal getEffectiveBalance(String walletAddress, String token) {
        if (walletAddress == null || walletAddress.isBlank()) {
            return BigDecimal.ZERO.setScale(SCALE, RoundingMode.HALF_UP);
        }

        String normalizedToken = token.toUpperCase(Locale.ROOT);
        BigDecimal base = NATIVE_TOKEN.equals(normalizedToken)
                ? blockchainService.getBalance(walletAddress)
                : BigDecimal.ZERO;

        BigDecimal adjustment = ledgerStore.getAdjustment(walletAddress, normalizedToken);

        return base.add(adjustment).setScale(SCALE, RoundingMode.HALF_UP);
    }

    private String normalizeToken(String token, String fallback) {
        if (token == null || token.isBlank()) {
            return fallback;
        }

        String normalized = token.trim().toUpperCase(Locale.ROOT);
        if (!TOKENS.contains(normalized)) {
            throw new IllegalArgumentException("Unsupported token: " + token);
        }

        return normalized;
    }

    private String normalizeToToken(String fromToken, String toToken) {
        if (toToken != null && !toToken.isBlank()) {
            return normalizeToken(toToken, null);
        }

        return NATIVE_TOKEN.equalsIgnoreCase(fromToken) ? "BTC" : NATIVE_TOKEN;
    }

    private String formatAmount(BigDecimal value) {
        return value.stripTrailingZeros().toPlainString();
    }
}
