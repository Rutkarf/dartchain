package io.dartchain.backend.showcase.service;

import io.dartchain.backend.showcase.dto.ChartPointDto;
import io.dartchain.backend.showcase.dto.ChartResponse;
import io.dartchain.backend.showcase.model.PriceSample;
import jakarta.annotation.PostConstruct;
import org.springframework.stereotype.Service;

import java.text.NumberFormat;
import java.time.Duration;
import java.time.Instant;
import java.util.ArrayList;
import java.util.Comparator;
import java.util.List;
import java.util.Locale;
import java.util.concurrent.CopyOnWriteArrayList;
import java.util.concurrent.ThreadLocalRandom;
import java.util.stream.Collectors;

@Service
public class MarketChartService {

    private static final double BASE_PRICE = 1.248;
    private static final int MAX_SAMPLES = 2_000;

    private final CopyOnWriteArrayList<PriceSample> samples = new CopyOnWriteArrayList<>();
    private volatile double lastPrice = BASE_PRICE;
    private volatile long totalVolumeUnits = 48_200;

    @PostConstruct
    public void seedHistory() {
        if (!samples.isEmpty()) {
            return;
        }

        Instant now = Instant.now();
        double price = BASE_PRICE * 0.94;

        for (int hour = 168; hour >= 0; hour--) {
            double drift = ThreadLocalRandom.current().nextDouble(-0.012, 0.016);
            price = Math.max(0.85, Math.min(1.45, price * (1 + drift)));
            long timestamp = now.minus(Duration.ofHours(hour)).toEpochMilli();
            samples.add(new PriceSample(timestamp, price));
        }

        lastPrice = price;
    }

    public synchronized void recordBlockMined() {
        double bump = ThreadLocalRandom.current().nextDouble(0.002, 0.018);
        lastPrice = Math.max(0.85, Math.min(1.55, lastPrice * (1 + bump)));
        samples.add(new PriceSample(System.currentTimeMillis(), lastPrice));
        totalVolumeUnits += ThreadLocalRandom.current().nextInt(120, 480);
        trimSamples();
    }

    public ChartResponse getChart(String pair, String range) {
        String resolvedPair = pair == null || pair.isBlank() ? "R4V3-CHF" : pair.trim();
        String resolvedRange = normalizeRange(range);

        long cutoff = resolveCutoff(resolvedRange);
        List<PriceSample> filtered = samples.stream()
                .filter(sample -> sample.getTimestamp() >= cutoff)
                .sorted(Comparator.comparingLong(PriceSample::getTimestamp))
                .collect(Collectors.toCollection(ArrayList::new));

        if (filtered.isEmpty()) {
            filtered = List.of(new PriceSample(System.currentTimeMillis(), lastPrice));
        }

        List<PriceSample> sampled = downsample(filtered, resolveTargetPoints(resolvedRange));
        List<Double> prices = sampled.stream().map(PriceSample::getPrice).toList();

        double current = prices.get(prices.size() - 1);
        double first = prices.get(0);
        double high = prices.stream().mapToDouble(Double::doubleValue).max().orElse(current);
        double low = prices.stream().mapToDouble(Double::doubleValue).min().orElse(current);
        double changePercent = first == 0 ? 0 : ((current - first) / first) * 100;

        List<ChartPointDto> points = normalizeForSvg(sampled);

        return new ChartResponse(
                resolvedPair,
                resolvedRange,
                formatPrice(current),
                round(changePercent),
                changePercent >= 0,
                formatPrice(high),
                formatPrice(low),
                formatVolume(totalVolumeUnits),
                points
        );
    }

    private List<ChartPointDto> normalizeForSvg(List<PriceSample> sampled) {
        List<Double> prices = sampled.stream().map(PriceSample::getPrice).toList();
        double min = prices.stream().mapToDouble(Double::doubleValue).min().orElse(0);
        double max = prices.stream().mapToDouble(Double::doubleValue).max().orElse(0);

        if (max == min) {
            return sampled.stream()
                    .map(sample -> new ChartPointDto(sample.getTimestamp(), 50))
                    .toList();
        }

        List<ChartPointDto> points = new ArrayList<>();

        for (PriceSample sample : sampled) {
            double normalized = 8 + ((sample.getPrice() - min) / (max - min)) * 84;
            points.add(new ChartPointDto(sample.getTimestamp(), round(normalized)));
        }

        return points;
    }

    private List<PriceSample> downsample(List<PriceSample> samples, int targetCount) {
        if (samples.size() <= targetCount) {
            return samples;
        }

        double step = (samples.size() - 1.0) / (targetCount - 1.0);
        List<PriceSample> result = new ArrayList<>();

        for (int index = 0; index < targetCount; index++) {
            int sampleIndex = (int) Math.round(index * step);
            result.add(samples.get(sampleIndex));
        }

        return result;
    }

    private int resolveTargetPoints(String range) {
        return switch (range) {
            case "1h" -> 120;
            case "7d" -> 336;
            case "30d", "90d", "365d" -> 1_000;
            default -> 288;
        };
    }

    private long resolveCutoff(String range) {
        Instant now = Instant.now();

        return switch (range) {
            case "1h" -> now.minus(Duration.ofHours(1)).toEpochMilli();
            case "7d" -> now.minus(Duration.ofDays(7)).toEpochMilli();
            case "30d" -> now.minus(Duration.ofDays(30)).toEpochMilli();
            case "90d" -> now.minus(Duration.ofDays(90)).toEpochMilli();
            case "365d" -> now.minus(Duration.ofDays(365)).toEpochMilli();
            default -> now.minus(Duration.ofHours(24)).toEpochMilli();
        };
    }

    private String normalizeRange(String range) {
        if (range == null) {
            return "24h";
        }

        return switch (range.toLowerCase(Locale.ROOT)) {
            case "1h", "7d", "30d", "90d", "365d" -> range.toLowerCase(Locale.ROOT);
            default -> "24h";
        };
    }

    private void trimSamples() {
        while (samples.size() > MAX_SAMPLES) {
            samples.remove(0);
        }
    }

    private String formatPrice(double value) {
        NumberFormat formatter = NumberFormat.getNumberInstance(Locale.FRANCE);
        formatter.setMinimumFractionDigits(3);
        formatter.setMaximumFractionDigits(3);
        return formatter.format(value);
    }

    private String formatVolume(long value) {
        if (value >= 1_000) {
            return String.format(Locale.FRANCE, "%.1fk", value / 1_000.0);
        }
        return String.valueOf(value);
    }

    private double round(double value) {
        return Math.round(value * 100.0) / 100.0;
    }
}
