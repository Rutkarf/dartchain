package io.dartchain.backend.exchange.infrastructure.web;

import io.dartchain.backend.exchange.dto.CryptoChartResponse;
import io.dartchain.backend.exchange.dto.CryptoRatePanelResponse;
import io.dartchain.backend.exchange.dto.CryptoSearchResult;
import io.dartchain.backend.exchange.application.CryptoRatesProxyService;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

import java.util.List;

@RestController
@RequestMapping("/api/crypto-rates")
public class CryptoRatesController {

    private final CryptoRatesProxyService cryptoRatesProxyService;

    public CryptoRatesController(CryptoRatesProxyService cryptoRatesProxyService) {
        this.cryptoRatesProxyService = cryptoRatesProxyService;
    }

    @GetMapping("/panels")
    public List<CryptoRatePanelResponse> getPanels() {
        return cryptoRatesProxyService.getPanels();
    }

    @GetMapping("/panels/batch")
    public List<CryptoRatePanelResponse> getPanelsBatch(@RequestParam String coins) {
        return cryptoRatesProxyService.getPanelsBatch(coins);
    }

    @GetMapping("/panels/native")
    public CryptoRatePanelResponse getNativePanel() {
        return cryptoRatesProxyService.getNativeR4v3Panel();
    }

    @GetMapping("/search")
    public List<CryptoSearchResult> searchCoins(@RequestParam String q) {
        return cryptoRatesProxyService.searchCoins(q);
    }

    @GetMapping("/chart")
    public CryptoChartResponse getChart(
            @RequestParam String symbol,
            @RequestParam(required = false) String coinId,
            @RequestParam(defaultValue = "24h") String range,
            @RequestParam(defaultValue = "eur") String currency
    ) {
        return cryptoRatesProxyService.getChart(symbol, coinId, range, currency);
    }
}
