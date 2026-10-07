package io.dartchain.backend.exchange.application;

import io.dartchain.backend.auth.model.UserAccount;
import io.dartchain.backend.blockchain.dto.CreatePendingTransactionRequest;
import io.dartchain.backend.exchange.dto.ExchangePanelResponse;
import io.dartchain.backend.auth.application.AuthService;
import io.dartchain.backend.exchange.dto.ExchangeSwapRequest;
import io.dartchain.backend.exchange.dto.ExchangeSwapResponse;
import io.dartchain.backend.exchange.store.ExchangeLedgerStore;
import io.dartchain.backend.quests.application.QuestService;
import io.dartchain.backend.ops.ApplicationMetricsCollector;
import io.dartchain.backend.showcase.application.LaunchLabService;
import io.dartchain.backend.showcase.application.NewsService;
import io.dartchain.backend.blockchain.application.BlockchainService;
import io.dartchain.backend.exchange.application.CryptoRatesProxyService;
import io.dartchain.backend.blockchain.application.PendingTransactionService;
import io.dartchain.backend.wallet.dto.WalletHoldingDto;
import io.dartchain.backend.wallet.dto.WalletPortfolioResponse;
import io.dartchain.backend.wallet.store.WalletBalanceStore;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.context.annotation.Lazy;
import org.springframework.stereotype.Service;

import java.math.BigDecimal;
import java.math.RoundingMode;
import java.util.ArrayList;
import java.util.LinkedHashSet;
import java.util.List;
import java.util.Locale;
import java.util.Map;
import java.util.Set;

@Service
public class ExchangeService {

    public static final String NATIVE_TOKEN = "R4V3";
    /** Contre-actif natif ; seuls R4V3 et les tokens Laboratoire sont échangeables. */
    private static final List<String> TOKENS = List.of(NATIVE_TOKEN);
    private static final int SCALE = 8;
    private static final int NATIVE_SCALE = 26;

    private static final BigDecimal LAUNCH_TOKEN_EUR_PRICE = new BigDecimal("0.05");

    private final BlockchainService blockchainService;
    private final CryptoRatesProxyService cryptoRates;
    private final ExchangeLedgerStore ledgerStore;
    private final WalletBalanceStore walletBalanceStore;
    private final PendingTransactionService pendingTransactionService;
    private final NewsService newsService;
    private final LaunchLabService launchLabService;
    private final QuestService questService;
    private final AuthService authService;
    private final ApplicationMetricsCollector metricsCollector;

    public ExchangeService(
            BlockchainService blockchainService,
            CryptoRatesProxyService cryptoRates,
            ExchangeLedgerStore ledgerStore,
            WalletBalanceStore walletBalanceStore,
            PendingTransactionService pendingTransactionService,
            NewsService newsService,
            LaunchLabService launchLabService,
            AuthService authService,
            ApplicationMetricsCollector metricsCollector
    ) {
        this(
                blockchainService,
                cryptoRates,
                ledgerStore,
                walletBalanceStore,
                pendingTransactionService,
                newsService,
                launchLabService,
                null,
                authService,
                metricsCollector
        );
    }

    @Autowired
    public ExchangeService(
            BlockchainService blockchainService,
            CryptoRatesProxyService cryptoRates,
            ExchangeLedgerStore ledgerStore,
            WalletBalanceStore walletBalanceStore,
            PendingTransactionService pendingTransactionService,
            NewsService newsService,
            LaunchLabService launchLabService,
            @Lazy QuestService questService,
            AuthService authService,
            ApplicationMetricsCollector metricsCollector
    ) {
        this.blockchainService = blockchainService;
        this.cryptoRates = cryptoRates;
        this.ledgerStore = ledgerStore;
        this.walletBalanceStore = walletBalanceStore;
        this.pendingTransactionService = pendingTransactionService;
        this.newsService = newsService;
        this.launchLabService = launchLabService;
        this.questService = questService;
        this.authService = authService;
        this.metricsCollector = metricsCollector;
    }

    public ExchangePanelResponse getPanel(String walletAddress, String fromToken, String toToken) {
        String from = normalizeToken(fromToken, NATIVE_TOKEN);
        String to = normalizeToToken(from, toToken);
        validateSwapPair(from, to);

        return new ExchangePanelResponse(
                from,
                to,
                supportedTokens(),
                getEffectiveBalance(walletAddress, from),
                getEffectiveBalance(walletAddress, to),
                getRate(from, to),
                true
        );
    }

    public ExchangeSwapResponse swap(ExchangeSwapRequest request, String authorizationHeader) {
        if (request == null) {
            throw new IllegalArgumentException("Request is required");
        }

        String walletAddress = request.walletAddress();
        if (walletAddress == null || walletAddress.isBlank()) {
            throw new IllegalArgumentException("walletAddress is required");
        }

        var account = authService.requireAuthenticatedAccount(authorizationHeader);
        authService.ensureWalletOwnership(account, walletAddress);

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

        validateSwapPair(fromToken, toToken);

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

        persistPortfolio(
                walletAddress,
                "SWAP",
                fromToken + "->" + toToken + " in=" + formatAmount(amount) + " out=" + formatAmount(amountOut)
        );

        recordSwapTrace(account, walletAddress, response);
        newsService.publishSwapEvent(walletAddress, response);
        recordSwapQuestProgress(walletAddress, fromToken, toToken);
        metricsCollector.recordSwap(fromToken + "->" + toToken);

        return response;
    }

    /**
     * Portfolio wallet : R4V3 (chaîne + ledger) + tokens swap non nuls.
     * Persiste les snapshots dans {@code wallet_balances} pour vérifications.
     */
    public WalletPortfolioResponse getPortfolio(String walletAddress) {
        return persistPortfolio(walletAddress, "SYNC", null);
    }

    /** Synchronise le snapshot R4V3 (et tokens ledger) après mint / lecture solde. */
    public void syncPersistedBalances(String walletAddress) {
        if (walletAddress == null || walletAddress.isBlank()) {
            return;
        }
        persistPortfolio(walletAddress, "SYNC", null);
    }

    private WalletPortfolioResponse persistPortfolio(String walletAddress, String eventType, String reference) {
        if (walletAddress == null || walletAddress.isBlank()) {
            return new WalletPortfolioResponse("", NATIVE_TOKEN, List.of(), 0, System.currentTimeMillis());
        }

        String wallet = walletAddress.trim();
        List<WalletHoldingDto> holdings = buildHoldings(wallet);

        for (WalletHoldingDto holding : holdings) {
            walletBalanceStore.upsertAndAudit(
                    wallet,
                    holding.token(),
                    new BigDecimal(holding.balance()),
                    new BigDecimal(holding.chainBalance()),
                    new BigDecimal(holding.ledgerAdjustment()),
                    eventType,
                    reference
            );
        }

        int otherCount = (int) holdings.stream().filter(holding -> !holding.nativeToken()).count();
        return new WalletPortfolioResponse(
                wallet,
                NATIVE_TOKEN,
                holdings,
                otherCount,
                System.currentTimeMillis()
        );
    }

    private List<WalletHoldingDto> buildHoldings(String walletAddress) {
        List<WalletHoldingDto> holdings = new ArrayList<>();

        BigDecimal chainBalance = blockchainService.getBalance(walletAddress);
        BigDecimal nativeAdjustment = ledgerStore.getAdjustment(walletAddress, NATIVE_TOKEN);
        BigDecimal nativeBalance = chainBalance.add(nativeAdjustment)
                .setScale(NATIVE_SCALE, RoundingMode.HALF_UP);

        holdings.add(new WalletHoldingDto(
                NATIVE_TOKEN,
                nativeBalance.toPlainString(),
                chainBalance.setScale(NATIVE_SCALE, RoundingMode.HALF_UP).toPlainString(),
                nativeAdjustment.setScale(NATIVE_SCALE, RoundingMode.HALF_UP).toPlainString(),
                true
        ));

        Map<String, BigDecimal> adjustments = ledgerStore.listAdjustments(walletAddress);
        for (Map.Entry<String, BigDecimal> entry : adjustments.entrySet()) {
            String token = entry.getKey();
            if (NATIVE_TOKEN.equalsIgnoreCase(token)) {
                continue;
            }
            BigDecimal amount = entry.getValue();
            if (amount == null || amount.compareTo(BigDecimal.ZERO) == 0) {
                continue;
            }
            BigDecimal scaled = amount.setScale(SCALE, RoundingMode.HALF_UP);
            holdings.add(new WalletHoldingDto(
                    token.toUpperCase(Locale.ROOT),
                    scaled.toPlainString(),
                    BigDecimal.ZERO.setScale(SCALE, RoundingMode.HALF_UP).toPlainString(),
                    scaled.toPlainString(),
                    false
            ));
        }

        return holdings;
    }

    private void recordSwapQuestProgress(String walletAddress, String fromToken, String toToken) {
        if (questService == null || !involvesLaunchLabToken(fromToken, toToken)) {
            return;
        }

        questService.recordProgressForWallet(walletAddress, "swap-tokens", 1);
    }

    private boolean involvesLaunchLabToken(String fromToken, String toToken) {
        return isLaunchLabOnlyToken(fromToken) || isLaunchLabOnlyToken(toToken);
    }

    private boolean isLaunchLabOnlyToken(String token) {
        if (token == null || token.isBlank()) {
            return false;
        }

        String normalized = token.trim().toUpperCase(Locale.ROOT);
        if (NATIVE_TOKEN.equals(normalized)) {
            return false;
        }

        if (TOKENS.contains(normalized)) {
            return false;
        }

        return launchLabService.isLaunchToken(normalized);
    }

  /**
   * Crédit testnet désactivé : les wallets démarrent sans solde initial.
   * @return false (aucun crédit appliqué)
   */
  public boolean seedWelcomeCredits(String walletAddress) {
    return false;
  }

    /** Solde R4V3 effectif (chaîne R4V3chainz + ajustements testnet). */
    public BigDecimal getEffectiveNativeBalance(String walletAddress) {
        return getEffectiveBalance(walletAddress, NATIVE_TOKEN);
    }

    private void recordSwapTrace(UserAccount account, String walletAddress, ExchangeSwapResponse response) {
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
            pendingTransactionService.addPendingTransaction(request, account);
        } catch (RuntimeException ignored) {
            // Ne pas bloquer le swap si la trace pending échoue (doublon, etc.).
        }
    }

    private BigDecimal getRate(String fromToken, String toToken) {
        BigDecimal fromEur = unitEurPrice(fromToken);
        BigDecimal toEur = unitEurPrice(toToken);

        if (toEur.compareTo(BigDecimal.ZERO) == 0) {
            throw new IllegalArgumentException("Invalid rate for " + toToken);
        }

        return fromEur.divide(toEur, SCALE, RoundingMode.HALF_UP);
    }

    private BigDecimal unitEurPrice(String token) {
        if (launchLabService.isLaunchToken(token) && !NATIVE_TOKEN.equalsIgnoreCase(token)) {
            return LAUNCH_TOKEN_EUR_PRICE;
        }

        return cryptoRates.getEurUnitPrice(token);
    }

    private List<String> supportedTokens() {
        Set<String> tokens = new LinkedHashSet<>();
        tokens.add(NATIVE_TOKEN);
        tokens.addAll(launchLabService.listSymbols());
        return new ArrayList<>(tokens);
    }

    private void validateSwapPair(String fromToken, String toToken) {
        boolean fromIsNative = NATIVE_TOKEN.equalsIgnoreCase(fromToken);
        boolean toIsNative = NATIVE_TOKEN.equalsIgnoreCase(toToken);
        if (!fromIsNative && !toIsNative) {
            throw new IllegalArgumentException(
                    "Les échanges du laboratoire exigent R4V3 (m4t3r) comme contre-actif"
            );
        }
    }

    private String defaultLaunchCounterToken() {
        return launchLabService.listSymbols().stream()
                .map(symbol -> symbol.trim().toUpperCase(Locale.ROOT))
                .filter(symbol -> !NATIVE_TOKEN.equalsIgnoreCase(symbol))
                .findFirst()
                .orElse("PXD");
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

        int scale = NATIVE_TOKEN.equals(normalizedToken) ? NATIVE_SCALE : SCALE;
        return base.add(adjustment).setScale(scale, RoundingMode.HALF_UP);
    }

    private String normalizeToken(String token, String fallback) {
        if (token == null || token.isBlank()) {
            return fallback;
        }

        String normalized = token.trim().toUpperCase(Locale.ROOT);
        if (!supportedTokens().contains(normalized)) {
            throw new IllegalArgumentException("Unsupported token: " + token);
        }

        return normalized;
    }

    private String normalizeToToken(String fromToken, String toToken) {
        if (toToken != null && !toToken.isBlank()) {
            return normalizeToken(toToken, null);
        }

        return NATIVE_TOKEN.equalsIgnoreCase(fromToken)
                ? defaultLaunchCounterToken()
                : NATIVE_TOKEN;
    }

    private String formatAmount(BigDecimal value) {
        return value.stripTrailingZeros().toPlainString();
    }
}
