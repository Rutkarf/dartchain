package io.dartchain.backend.service;

import io.dartchain.backend.dto.ExchangeSwapRequest;
import io.dartchain.backend.dto.ExchangeSwapResponse;
import io.dartchain.backend.exchange.ExchangeLedgerStore;
import io.dartchain.backend.showcase.service.NewsService;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.io.TempDir;

import java.math.BigDecimal;
import java.nio.file.Path;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.anyString;
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
    private ExchangeService exchangeService;

    @BeforeEach
    void setUp() {
        Path ledgerPath = tempDir.resolve("exchange-ledger.json");
        ledgerStore = new ExchangeLedgerStore(
                new com.fasterxml.jackson.databind.ObjectMapper(),
                ledgerPath.toString()
        );

        blockchainService = mock(BlockchainService.class);
        cryptoRates = mock(CryptoRatesProxyService.class);
        pendingTransactionService = mock(PendingTransactionService.class);
        newsService = mock(NewsService.class);

        when(blockchainService.getBalance(anyString())).thenReturn(BigDecimal.ZERO);
        when(cryptoRates.getEurUnitPrice("BTC")).thenReturn(new BigDecimal("50000"));
        when(cryptoRates.getEurUnitPrice("R4V3")).thenReturn(BigDecimal.ONE);

        exchangeService = new ExchangeService(
                blockchainService,
                cryptoRates,
                ledgerStore,
                pendingTransactionService,
                newsService
        );
    }

    @Test
    void seedWelcomeCredits_appliesOnce() {
        String wallet = "abc123wallet";

        assertThat(exchangeService.seedWelcomeCredits(wallet)).isTrue();
        assertThat(exchangeService.seedWelcomeCredits(wallet)).isFalse();

        assertThat(exchangeService.getPanel(wallet, "BTC", "R4V3").fromBalance())
                .isEqualByComparingTo("0.001");
        assertThat(exchangeService.getPanel(wallet, "R4V3", "BTC").fromBalance())
                .isEqualByComparingTo("10");
    }

    @Test
    void swap_updatesPersistedBalances() {
        String wallet = "abc123wallet";
        exchangeService.seedWelcomeCredits(wallet);

        ExchangeSwapResponse response = exchangeService.swap(
                new ExchangeSwapRequest("BTC", "R4V3", new BigDecimal("0.001"), wallet)
        );

        assertThat(response.amountOut()).isGreaterThan(BigDecimal.ZERO);
        assertThat(exchangeService.getPanel(wallet, "BTC", "R4V3").fromBalance())
                .isEqualByComparingTo("0");
        assertThat(exchangeService.getEffectiveNativeBalance(wallet))
                .isEqualByComparingTo(response.toBalance());

        verify(newsService).publishSwapEvent(anyString(), any(ExchangeSwapResponse.class));
    }
}
