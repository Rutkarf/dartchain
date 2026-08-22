package io.dartchain.backend.exchange.application;

import io.dartchain.backend.auth.AuthService;
import io.dartchain.backend.auth.UserAccount;
import io.dartchain.backend.exchange.dto.ExchangeSwapRequest;
import io.dartchain.backend.exchange.dto.ExchangeSwapResponse;
import io.dartchain.backend.exchange.JsonExchangeLedgerStore;
import io.dartchain.backend.exchange.store.ExchangeLedgerStore;
import io.dartchain.backend.ops.ApplicationMetricsCollector;
import io.dartchain.backend.showcase.application.LaunchLabService;
import io.dartchain.backend.showcase.application.NewsService;
import io.dartchain.backend.blockchain.application.BlockchainService;
import io.dartchain.backend.blockchain.application.PendingTransactionService;
import io.dartchain.backend.exchange.application.CryptoRatesProxyService;
import io.dartchain.backend.exchange.application.ExchangeService;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.io.TempDir;

import java.math.BigDecimal;
import java.nio.file.Path;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.anyString;
import static org.mockito.Mockito.doNothing;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

class ExchangeServiceTest {

    @TempDir
    Path tempDir;

    private ExchangeLedgerStore ledgerStore;
    private BlockchainService blockchainService;
    private CryptoRatesProxyService cryptoRates;
    private PendingTransactionService pendingTransactionService;
    private NewsService newsService;
    private LaunchLabService launchLabService;
    private AuthService authService;
    private ExchangeService exchangeService;

    @BeforeEach
    void setUp() {
        Path ledgerPath = tempDir.resolve("exchange-ledger.json");
        ledgerStore = new JsonExchangeLedgerStore(
                new com.fasterxml.jackson.databind.ObjectMapper(),
                ledgerPath.toString()
        );

        blockchainService = mock(BlockchainService.class);
        cryptoRates = mock(CryptoRatesProxyService.class);
        pendingTransactionService = mock(PendingTransactionService.class);
        newsService = mock(NewsService.class);
        launchLabService = mock(LaunchLabService.class);
        authService = mock(AuthService.class);

        when(blockchainService.getBalance(anyString())).thenReturn(BigDecimal.ZERO);
        when(cryptoRates.getEurUnitPrice("R4V3")).thenReturn(BigDecimal.ONE);
        when(launchLabService.listSymbols()).thenReturn(java.util.List.of("R4V3", "DART"));
        when(launchLabService.isLaunchToken("DART")).thenReturn(true);
        when(authService.requireAuthenticatedAccount(anyString())).thenReturn(
                new UserAccount("user-1", "alice", "alice@dartchain.dev", "hash", "salt", 0L)
        );
        doNothing().when(authService).ensureWalletOwnership(any(UserAccount.class), anyString());

        exchangeService = new ExchangeService(
                blockchainService,
                cryptoRates,
                ledgerStore,
                pendingTransactionService,
                newsService,
                launchLabService,
                authService,
                new ApplicationMetricsCollector()
        );
    }

  @Test
  void seedWelcomeCredits_isDisabled() {
    String wallet = "abc123wallet";

    assertThat(exchangeService.seedWelcomeCredits(wallet)).isFalse();
    assertThat(exchangeService.getPanel(wallet, "R4V3", "DART").fromBalance())
                .isEqualByComparingTo("0");
        assertThat(exchangeService.getPanel(wallet, "DART", "R4V3").fromBalance())
                .isEqualByComparingTo("0");
    }

    @Test
    void swap_updatesPersistedBalances() {
        String wallet = "abc123wallet";
        when(launchLabService.listSymbols()).thenReturn(java.util.List.of("R4V3", "DART"));
        when(launchLabService.isLaunchToken("DART")).thenReturn(true);
        when(blockchainService.getBalance(wallet)).thenReturn(new BigDecimal("100"));
        when(cryptoRates.getEurUnitPrice("R4V3")).thenReturn(BigDecimal.ONE);

        ExchangeSwapResponse response = exchangeService.swap(
                new ExchangeSwapRequest("R4V3", "DART", new BigDecimal("10"), wallet),
                "Bearer test-token"
        );

        assertThat(response.amountOut()).isGreaterThan(BigDecimal.ZERO);
        assertThat(exchangeService.getPanel(wallet, "R4V3", "DART").fromBalance())
                .isEqualByComparingTo("90");
        assertThat(exchangeService.getPanel(wallet, "R4V3", "DART").toBalance())
                .isGreaterThan(BigDecimal.ZERO);

        verify(newsService).publishSwapEvent(anyString(), any(ExchangeSwapResponse.class));
    }

    @Test
    void swap_rejectsNonLaunchpadTokens() {
        assertThat(org.junit.jupiter.api.Assertions.assertThrows(
                IllegalArgumentException.class,
                () -> exchangeService.swap(
                        new ExchangeSwapRequest("BTC", "R4V3", new BigDecimal("0.001"), "abc123wallet"),
                        "Bearer test-token"
                )
        ).getMessage()).contains("Unsupported token");
    }
}
