package io.dartchain.backend.showcase.service;

import io.dartchain.backend.dto.CryptoRatePanelResponse;
import io.dartchain.backend.service.CryptoRatesProxyService;
import io.dartchain.backend.showcase.dto.NewsFeedResponse;
import io.dartchain.backend.showcase.dto.NewsItemResponse;
import io.dartchain.backend.showcase.dto.R4v3ShowcaseResponse;
import io.dartchain.backend.showcase.dto.R4v3SwapStatsResponse;
import io.dartchain.backend.showcase.dto.R4v3TokenQuoteResponse;
import org.springframework.stereotype.Service;

import java.math.BigDecimal;
import java.math.RoundingMode;
import java.time.Instant;
import java.util.List;
import java.util.Locale;

@Service
public class ShowcaseR4v3Service {

    private static final List<String> LAUNCH_TOKENS = List.of("PXD", "NVFI", "LAB3", "ORB");
    private static final BigDecimal LAUNCH_TOKEN_R4V3_RATE = new BigDecimal("20");

    private final CryptoRatesProxyService cryptoRatesProxyService;
    private final NewsService newsService;

    public ShowcaseR4v3Service(
            CryptoRatesProxyService cryptoRatesProxyService,
            NewsService newsService
    ) {
        this.cryptoRatesProxyService = cryptoRatesProxyService;
        this.newsService = newsService;
    }

    public R4v3ShowcaseResponse getDashboard(String source, int limit, int offset) {
        long started = System.nanoTime();
        CryptoRatePanelResponse panel = cryptoRatesProxyService.getNativeR4v3Panel();
        long ratesLatencyMs = Math.max(0L, (System.nanoTime() - started) / 1_000_000L);

        NewsFeedResponse news = newsService.getFeed("R4V3", source, limit, offset);

        return new R4v3ShowcaseResponse(
                panel,
                news,
                buildLaunchTokens(),
                buildSwapStats(news),
                ratesLatencyMs,
                Instant.now().toString()
        );
    }

    private List<R4v3TokenQuoteResponse> buildLaunchTokens() {
        return LAUNCH_TOKENS.stream()
                .map(symbol -> new R4v3TokenQuoteResponse(
                        symbol,
                        formatTokenPrice(symbol),
                        "+0.0%",
                        true
                ))
                .toList();
    }

    private String formatTokenPrice(String symbol) {
        BigDecimal r4v3PerToken = LAUNCH_TOKEN_R4V3_RATE;
        if ("R4V3".equalsIgnoreCase(symbol)) {
            r4v3PerToken = new BigDecimal("1");
        }

        return r4v3PerToken.stripTrailingZeros().toPlainString() + " R4V3";
    }

    private R4v3SwapStatsResponse buildSwapStats(NewsFeedResponse news) {
        List<NewsItemResponse> swapItems = news.items().stream()
                .filter(item -> item.id() != null && item.id().startsWith("swap-"))
                .toList();

        String lastSummary = swapItems.isEmpty()
                ? "—"
                : swapItems.get(0).summary();

        return new R4v3SwapStatsResponse(swapItems.size(), lastSummary);
    }
}
