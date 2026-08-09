package io.dartchain.backend.service;

import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import io.dartchain.backend.dto.CryptoChartResponse;
import io.dartchain.backend.dto.CryptoRatePanelResponse;
import io.dartchain.backend.dto.CryptoSearchResult;
import org.springframework.stereotype.Service;
import org.springframework.web.client.RestClient;
import org.springframework.web.client.RestClientException;

import java.math.BigDecimal;
import java.text.NumberFormat;
import java.util.ArrayList;
import java.util.HashMap;
import java.util.List;
import java.util.Locale;
import java.util.Map;
import java.util.concurrent.atomic.AtomicReference;

@Service
public class CryptoRatesProxyService {

    private static final String COINGECKO_BASE = "https://api.coingecko.com/api/v3";
    private static final String GECKO_TERMINAL_BASE = "https://api.geckoterminal.com/api/v2";
    private static final long CACHE_TTL_MS = 60_000;
    private static final double DART_EUR_REFERENCE = 1.248;

    private static final List<CoinConfig> TRACKED_COINS = List.of(
            new CoinConfig("BTC", "bitcoin"),
            new CoinConfig("ETH", "ethereum"),
            new CoinConfig("SOL", "solana"),
            new CoinConfig("BNB", "binancecoin"),
            new CoinConfig("XRP", "ripple"),
            new CoinConfig("ADA", "cardano"),
            new CoinConfig("DOGE", "dogecoin"),
            new CoinConfig("AVAX", "avalanche-2"),
            new CoinConfig("DOT", "polkadot"),
            new CoinConfig("LINK", "chainlink"),
            new CoinConfig("MATIC", "matic-network"),
            new CoinConfig("UNI", "uniswap"),
            new CoinConfig("TRX", "tron"),
            new CoinConfig("LTC", "litecoin"),
            new CoinConfig("ATOM", "cosmos"),
            new CoinConfig("SHIB", "shiba-inu")
    );

    private final RestClient restClient = RestClient.create();
    private final ObjectMapper objectMapper = new ObjectMapper();
    private final AtomicReference<CachedPanels> cache = new AtomicReference<>();

    public CryptoChartResponse getChart(String symbol, String coinId, String range, String currency) {
        String normalizedSymbol = symbol == null ? "BTC" : symbol.trim().toUpperCase(Locale.ROOT);
        String normalizedRange = normalizeChartRange(range);
        String normalizedCurrency = normalizeCurrency(currency);

        CoinConfig coin = resolveCoin(normalizedSymbol, coinId);

        int days = chartDaysForRange(normalizedRange);
        String vsCurrency = "usd".equals(normalizedCurrency) ? "usd" : "eur";

        List<ChartSample> samples = fetchRawSamples(coin.id(), days, vsCurrency);
        if ("r4v3".equals(normalizedCurrency)) {
            samples = samples.stream()
                    .map(sample -> new ChartSample(sample.timestamp(), sample.price() / DART_EUR_REFERENCE))
                    .toList();
        }

        if (samples.isEmpty()) {
            long now = System.currentTimeMillis();
            samples = List.of(
                    new ChartSample(now - 3 * 3_600_000L, 1.0),
                    new ChartSample(now - 2 * 3_600_000L, 1.0),
                    new ChartSample(now - 3_600_000L, 1.0),
                    new ChartSample(now, 1.0)
            );
        }

        List<Double> prices = samples.stream().map(ChartSample::price).toList();
        List<Long> timestamps = samples.stream().map(ChartSample::timestamp).toList();
        double current = prices.get(prices.size() - 1);
        double first = prices.get(0);
        double high = prices.stream().mapToDouble(Double::doubleValue).max().orElse(current);
        double low = prices.stream().mapToDouble(Double::doubleValue).min().orElse(current);
        double changePercent = first == 0 ? 0 : ((current - first) / first) * 100;

        List<Double> points = pricesToSvgCoordinates(prices);
        List<Double> volumes = padVolumes(normalizeVolumeBars(prices), points.size());

        return new CryptoChartResponse(
                coin.symbol(),
                normalizedRange,
                normalizedCurrency,
                formatValue(current),
                round(changePercent),
                changePercent >= 0,
                formatValue(high),
                formatValue(low),
                formatVolume(estimateVolume(prices)),
                points,
                volumes,
                prices,
                timestamps
        );
    }

    public List<CryptoRatePanelResponse> getPanels() {
        CachedPanels cached = cache.get();
        long now = System.currentTimeMillis();

        if (cached != null && now - cached.fetchedAt() < CACHE_TTL_MS) {
            return cached.panels();
        }

        FetchedRates fetched = fetchPanels();
        cache.set(new CachedPanels(now, fetched.panels(), fetched.eurPrices()));
        return fetched.panels();
    }

    public List<CryptoRatePanelResponse> getPanelsBatch(String coinsParam) {
        List<CoinConfig> coins = parseCoinEntries(coinsParam);
        if (coins.isEmpty()) {
            return List.of();
        }

        try {
            return fetchPanelsForCoins(coins);
        } catch (Exception exception) {
            return coins.stream()
                    .map(coin -> buildPanel(coin.symbol(), 0, 0, placeholderSparkline()))
                    .toList();
        }
    }

    public CryptoRatePanelResponse getNativeR4v3Panel() {
        try {
            List<Double> points = fetchChartPoints("bitcoin");
            CachedPanels cached = cache.get();
            double change24h = 0.0;

            if (cached != null && cached.panels() != null) {
                change24h = cached.panels().stream()
                        .filter(panel -> "BTC".equals(panel.symbol()))
                        .findFirst()
                        .map(panel -> parseChangePercent(panel.change()))
                        .orElse(0.0);
            }

            return new CryptoRatePanelResponse(
                    "R4V3",
                    "R4V3 / CHF",
                    formatValue(1.0),
                    (change24h >= 0 ? "+" : "") + String.format(Locale.US, "%.2f", change24h) + "%",
                    change24h >= 0,
                    points
            );
        } catch (Exception exception) {
            return new CryptoRatePanelResponse(
                    "R4V3",
                    "R4V3 / CHF",
                    formatValue(1.0),
                    "—",
                    true,
                    placeholderSparkline()
            );
        }
    }

    private double parseChangePercent(String change) {
        if (change == null || change.isBlank() || "—".equals(change)) {
            return 0.0;
        }

        try {
            return Double.parseDouble(change.replace("%", "").replace("+", "").trim());
        } catch (NumberFormatException exception) {
            return 0.0;
        }
    }

    public List<CryptoSearchResult> searchCoins(String query) {
        if (query == null || query.trim().length() < 2) {
            return List.of();
        }

        String trimmed = query.trim();
        List<CryptoSearchResult> results = new ArrayList<>(searchCoinGecko(trimmed));
        java.util.Set<String> seen = new java.util.HashSet<>();

        for (CryptoSearchResult result : results) {
            seen.add(result.id().toLowerCase(Locale.ROOT));
            seen.add(result.symbol().toUpperCase(Locale.ROOT));
        }

        for (CryptoSearchResult terminal : searchGeckoTerminal(trimmed)) {
            if (results.size() >= 8) {
                break;
            }

            String idKey = terminal.id().toLowerCase(Locale.ROOT);
            String symbolKey = terminal.symbol().toUpperCase(Locale.ROOT);
            if (seen.contains(idKey) || seen.contains(symbolKey)) {
                continue;
            }

            seen.add(idKey);
            seen.add(symbolKey);
            results.add(terminal);
        }

        return results;
    }

    private List<CryptoSearchResult> searchCoinGecko(String query) {
        try {
            String searchJson = restClient.get()
                    .uri(COINGECKO_BASE + "/search?query={query}", query)
                    .retrieve()
                    .body(String.class);

            JsonNode coins = objectMapper.readTree(searchJson).path("coins");
            List<CryptoSearchResult> results = new ArrayList<>();

            for (JsonNode coin : coins) {
                if (results.size() >= 6) {
                    break;
                }

                String id = coin.path("id").asText("");
                String symbol = coin.path("symbol").asText("").toUpperCase(Locale.ROOT);
                String name = coin.path("name").asText("");
                String thumb = coin.path("thumb").asText("");

                if (id.isBlank() || symbol.isBlank() || name.isBlank()) {
                    continue;
                }

                results.add(new CryptoSearchResult(id, symbol, name, thumb, "coingecko", ""));
            }

            return results;
        } catch (Exception exception) {
            return List.of();
        }
    }

    private List<CryptoSearchResult> searchGeckoTerminal(String query) {
        try {
            String searchJson = restClient.get()
                    .uri(GECKO_TERMINAL_BASE + "/search/pools?query={query}&include=base_token,quote_token&page=1", query)
                    .header("Accept", "application/json;version=20230302")
                    .retrieve()
                    .body(String.class);

            JsonNode root = objectMapper.readTree(searchJson);
            Map<String, JsonNode> tokensById = new HashMap<>();

            for (JsonNode node : root.path("included")) {
                if ("token".equals(node.path("type").asText())) {
                    tokensById.put(node.path("id").asText(), node);
                }
            }

            List<CryptoSearchResult> results = new ArrayList<>();
            java.util.Set<String> seen = new java.util.HashSet<>();

            for (JsonNode pool : root.path("data")) {
                if (results.size() >= 4) {
                    break;
                }

                JsonNode relationships = pool.path("relationships");
                for (String relation : List.of("base_token", "quote_token")) {
                    String tokenId = relationships.path(relation).path("data").path("id").asText("");
                    if (tokenId.isBlank()) {
                        continue;
                    }

                    JsonNode token = tokensById.get(tokenId);
                    if (token == null) {
                        continue;
                    }

                    JsonNode attributes = token.path("attributes");
                    String symbol = attributes.path("symbol").asText("").toUpperCase(Locale.ROOT);
                    String name = attributes.path("name").asText("");
                    String imageUrl = attributes.path("image_url").asText("");
                    String coinGeckoId = attributes.path("coingecko_coin_id").asText("");

                    if (symbol.isBlank() || name.isBlank() || coinGeckoId.isBlank()) {
                        continue;
                    }

                    String dedupeKey = coinGeckoId.toLowerCase(Locale.ROOT);
                    if (seen.contains(dedupeKey)) {
                        continue;
                    }
                    seen.add(dedupeKey);

                    String network = networkFromTokenId(tokenId);
                    results.add(new CryptoSearchResult(
                            coinGeckoId,
                            symbol,
                            name,
                            imageUrl,
                            "geckoterminal",
                            network
                    ));

                    if (results.size() >= 4) {
                        break;
                    }
                }
            }

            return results;
        } catch (Exception exception) {
            return List.of();
        }
    }

    private String networkFromTokenId(String tokenId) {
        if (tokenId == null || tokenId.isBlank()) {
            return "";
        }

        int separator = tokenId.indexOf('_');
        if (separator <= 0) {
            return tokenId;
        }

        return tokenId.substring(0, separator).toUpperCase(Locale.ROOT);
    }

    private List<CryptoRatePanelResponse> fetchPanelsForCoins(List<CoinConfig> coins) throws java.io.IOException {
        String coinIds = String.join(",", coins.stream().map(CoinConfig::id).toList());

        String pricesJson = restClient.get()
                .uri(COINGECKO_BASE + "/simple/price?ids={ids}&vs_currencies=eur&include_24hr_change=true", coinIds)
                .retrieve()
                .body(String.class);

        JsonNode prices = objectMapper.readTree(pricesJson);
        List<CryptoRatePanelResponse> panels = new ArrayList<>();

        for (CoinConfig coin : coins) {
            JsonNode coinNode = prices.path(coin.id());
            double eur = coinNode.path("eur").asDouble(0);
            double change24h = coinNode.path("eur_24h_change").asDouble(0);
            List<Double> points = fetchChartPoints(coin.id());
            panels.add(buildPanel(coin.symbol(), eur, change24h, points));
        }

        return panels;
    }

    private List<CoinConfig> parseCoinEntries(String coinsParam) {
        if (coinsParam == null || coinsParam.isBlank()) {
            return List.of();
        }

        List<CoinConfig> coins = new ArrayList<>();

        for (String entry : coinsParam.split(",")) {
            String trimmed = entry.trim();
            if (trimmed.isBlank()) {
                continue;
            }

            String[] parts = trimmed.split("\\|", 2);
            if (parts.length != 2) {
                continue;
            }

            String coinId = parts[0].trim().toLowerCase(Locale.ROOT);
            String symbol = parts[1].trim().toUpperCase(Locale.ROOT);

            if (coinId.isBlank() || symbol.isBlank()) {
                continue;
            }

            coins.add(new CoinConfig(symbol, coinId));
        }

        return coins;
    }

    private CoinConfig resolveCoin(String symbol, String coinId) {
        if (coinId != null && !coinId.isBlank()) {
            return new CoinConfig(symbol, coinId.trim().toLowerCase(Locale.ROOT));
        }

        return TRACKED_COINS.stream()
                .filter(entry -> entry.symbol().equals(symbol))
                .findFirst()
                .orElse(TRACKED_COINS.get(0));
    }

    private List<Double> placeholderSparkline() {
        return List.of(42.0, 44.0, 43.0, 46.0, 45.0, 48.0, 47.0, 50.0, 49.0, 52.0, 51.0, 53.0);
    }

    private FetchedRates fetchPanels() {
        String coinIds = String.join(",", TRACKED_COINS.stream().map(CoinConfig::id).toList());

        try {
            String pricesJson = restClient.get()
                    .uri(COINGECKO_BASE + "/simple/price?ids={ids}&vs_currencies=eur&include_24hr_change=true", coinIds)
                    .retrieve()
                    .body(String.class);

            JsonNode prices = objectMapper.readTree(pricesJson);
            List<CryptoRatePanelResponse> panels = new ArrayList<>();
            Map<String, Double> eurPrices = new HashMap<>();

            for (CoinConfig coin : TRACKED_COINS) {
                JsonNode coinNode = prices.path(coin.id());
                double eur = coinNode.path("eur").asDouble(0);
                double change24h = coinNode.path("eur_24h_change").asDouble(0);

                if (eur > 0) {
                    eurPrices.put(coin.symbol(), eur);
                }

                List<Double> points = fetchChartPoints(coin.id());
                panels.add(buildPanel(coin.symbol(), eur, change24h, points));
            }

            return new FetchedRates(panels, eurPrices);
        } catch (Exception exception) {
            CachedPanels cached = cache.get();
            if (cached != null) {
                return new FetchedRates(cached.panels(), cached.eurPrices());
            }
            return placeholderRates();
        }
    }

    private List<Double> fetchChartPoints(String coinId) {
        List<Double> prices = fetchRawSamples(coinId, 1, "eur").stream().map(ChartSample::price).toList();
        return normalizePanelPoints(prices);
    }

    private List<ChartSample> fetchRawSamples(String coinId, int days, String vsCurrency) {
        try {
            String chartJson = restClient.get()
                    .uri(
                            COINGECKO_BASE + "/coins/{id}/market_chart?vs_currency={currency}&days={days}",
                            coinId,
                            vsCurrency,
                            days
                    )
                    .retrieve()
                    .body(String.class);

            JsonNode prices = objectMapper.readTree(chartJson).path("prices");
            List<ChartSample> samples = new ArrayList<>();

            for (JsonNode entry : prices) {
                if (entry.isArray() && entry.size() >= 2) {
                    samples.add(new ChartSample(entry.get(0).asLong(), entry.get(1).asDouble()));
                }
            }

            return samples;
        } catch (RestClientException | java.io.IOException exception) {
            return List.of();
        }
    }

    private List<Double> padVolumes(List<Double> volumes, int targetSize) {
        List<Double> padded = new ArrayList<>(volumes);
        while (padded.size() < targetSize) {
            padded.add(padded.isEmpty() ? 50.0 : padded.get(padded.size() - 1));
        }
        return padded;
    }

    private List<Double> normalizeVolumeBars(List<Double> prices) {
        if (prices.size() < 2) {
            return List.of(50.0, 50.0);
        }

        List<Double> deltas = new ArrayList<>();
        for (int index = 1; index < prices.size(); index++) {
            deltas.add(Math.abs(prices.get(index) - prices.get(index - 1)));
        }

        double max = deltas.stream().mapToDouble(Double::doubleValue).max().orElse(1);
        if (max == 0) {
            return deltas.stream().map(value -> 50.0).toList();
        }

        return deltas.stream()
                .map(value -> 12 + (value / max) * 76)
                .toList();
    }

    private long estimateVolume(List<Double> prices) {
        double sum = 0;
        for (int index = 1; index < prices.size(); index++) {
            sum += Math.abs(prices.get(index) - prices.get(index - 1));
        }
        return Math.max(1000, (long) (sum * 12_000));
    }

    private String normalizeChartRange(String range) {
        if (range == null) {
            return "24h";
        }
        return switch (range.toLowerCase(Locale.ROOT)) {
            case "1h", "7d", "30d", "90d", "365d" -> range.toLowerCase(Locale.ROOT);
            case "1w" -> "7d";
            case "1mo", "3mo", "1y", "ytd" -> "365d";
            case "4h" -> "24h";
            case "1s", "1min", "5m", "15m", "30m" -> "1h";
            default -> "24h";
        };
    }

    private String normalizeCurrency(String currency) {
        if (currency == null) {
            return "eur";
        }
        return switch (currency.toLowerCase(Locale.ROOT)) {
            case "usd", "r4v3" -> currency.toLowerCase(Locale.ROOT);
            default -> "eur";
        };
    }

    private int chartDaysForRange(String range) {
        return switch (range) {
            case "7d" -> 7;
            case "30d" -> 30;
            case "90d" -> 90;
            case "365d" -> 365;
            default -> 1;
        };
    }


    private CryptoRatePanelResponse buildPanel(
            String symbol,
            double eur,
            double change24h,
            List<Double> points
    ) {
        return new CryptoRatePanelResponse(
                symbol,
                symbol + " / R4V3",
                formatValue(eur),
                (change24h >= 0 ? "+" : "") + String.format(Locale.US, "%.2f", change24h) + "%",
                change24h >= 0,
                points
        );
    }

    private String formatValue(double value) {
        NumberFormat formatter = NumberFormat.getNumberInstance(Locale.FRANCE);
        if (value >= 100) {
            formatter.setMinimumFractionDigits(0);
            formatter.setMaximumFractionDigits(0);
        } else if (value >= 1) {
            formatter.setMinimumFractionDigits(2);
            formatter.setMaximumFractionDigits(2);
        } else {
            formatter.setMinimumFractionDigits(6);
            formatter.setMaximumFractionDigits(6);
        }
        return formatter.format(value);
    }

    private String formatVolume(long value) {
        if (value >= 1_000_000) {
            return String.format(Locale.FRANCE, "%.1fM", value / 1_000_000.0);
        }
        if (value >= 1_000) {
            return String.format(Locale.FRANCE, "%.1fk", value / 1_000.0);
        }
        return String.valueOf(value);
    }

    private double round(double value) {
        return Math.round(value * 100.0) / 100.0;
    }

    private List<Double> pricesToSvgCoordinates(List<Double> values) {
        if (values.isEmpty()) {
            return List.of(50.0, 55.0, 52.0, 58.0, 54.0, 60.0, 57.0, 63.0);
        }

        double min = values.stream().mapToDouble(Double::doubleValue).min().orElse(0);
        double max = values.stream().mapToDouble(Double::doubleValue).max().orElse(0);

        if (max == min) {
            return values.stream().map(value -> 50.0).toList();
        }

        return values.stream()
                .map(value -> 8 + ((value - min) / (max - min)) * 84)
                .toList();
    }

    /** Sparkline des panneaux — sous-échantillonnage léger pour l’affichage compact. */
    private List<Double> normalizePanelPoints(List<Double> values) {
        if (values.isEmpty()) {
            return List.of(50.0, 55.0, 52.0, 58.0, 54.0, 60.0, 57.0, 63.0);
        }

        List<Double> sampled = sample(values, 12);
        return pricesToSvgCoordinates(sampled);
    }

    private List<Double> sample(List<Double> values, int targetCount) {
        if (values.size() <= targetCount) {
            return values;
        }

        double step = (values.size() - 1.0) / (targetCount - 1.0);
        List<Double> sampled = new ArrayList<>();

        for (int index = 0; index < targetCount; index++) {
            int sampleIndex = (int) Math.round(index * step);
            sampled.add(values.get(sampleIndex));
        }

        return sampled;
    }

    private FetchedRates placeholderRates() {
        List<Double> flatLine = List.of(42.0, 44.0, 43.0, 46.0, 45.0, 48.0, 47.0, 50.0, 49.0, 52.0, 51.0, 53.0);
        Map<String, Double> eurPrices = Map.ofEntries(
                Map.entry("BTC", 95_000.0),
                Map.entry("ETH", 3_500.0),
                Map.entry("SOL", 180.0),
                Map.entry("BNB", 600.0),
                Map.entry("XRP", 2.2),
                Map.entry("ADA", 0.9),
                Map.entry("DOGE", 0.35),
                Map.entry("AVAX", 35.0),
                Map.entry("DOT", 7.0),
                Map.entry("LINK", 15.0),
                Map.entry("MATIC", 0.45),
                Map.entry("UNI", 8.0),
                Map.entry("TRX", 0.25),
                Map.entry("LTC", 85.0),
                Map.entry("ATOM", 8.5),
                Map.entry("SHIB", 0.00002)
        );

        List<CryptoRatePanelResponse> panels = TRACKED_COINS.stream()
                .map(coin -> new CryptoRatePanelResponse(
                        coin.symbol(),
                        coin.symbol() + " / R4V3",
                        "—",
                        "—",
                        true,
                        flatLine
                ))
                .toList();

        return new FetchedRates(panels, eurPrices);
    }

    private record FetchedRates(
            List<CryptoRatePanelResponse> panels,
            Map<String, Double> eurPrices
    ) {}

    /**
     * Prix unitaire en EUR pour le calcul des taux de swap (R4V3 = 1 CHF).
     */
    public BigDecimal getEurUnitPrice(String symbol) {
        if (symbol == null || symbol.isBlank()) {
            throw new IllegalArgumentException("Symbol is required");
        }

        String normalized = symbol.trim().toUpperCase(Locale.ROOT);

        if ("R4V3".equals(normalized)) {
            return BigDecimal.ONE;
        }

        if ("USDT".equals(normalized)) {
            return BigDecimal.ONE;
        }

        if ("SHIB".equals(normalized)) {
            return new BigDecimal("0.000020");
        }

        CachedPanels cached = cache.get();
        if (cached != null && cached.eurPrices().containsKey(normalized)) {
            return BigDecimal.valueOf(cached.eurPrices().get(normalized));
        }

        getPanels();
        cached = cache.get();
        if (cached != null && cached.eurPrices().containsKey(normalized)) {
            return BigDecimal.valueOf(cached.eurPrices().get(normalized));
        }

        Map<String, Double> fallbackPrices = placeholderRates().eurPrices();
        if (fallbackPrices.containsKey(normalized)) {
            return BigDecimal.valueOf(fallbackPrices.get(normalized));
        }

        throw new IllegalArgumentException("Unsupported symbol for rate: " + symbol);
    }

    private record ChartSample(long timestamp, double price) {}

    private record CoinConfig(String symbol, String id) {}

    private record CachedPanels(
            long fetchedAt,
            List<CryptoRatePanelResponse> panels,
            Map<String, Double> eurPrices
    ) {}
}
