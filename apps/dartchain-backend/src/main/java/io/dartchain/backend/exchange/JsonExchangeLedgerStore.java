package io.dartchain.backend.exchange;

import com.fasterxml.jackson.databind.ObjectMapper;
import io.dartchain.backend.exchange.store.ExchangeLedgerStore;
import jakarta.annotation.PostConstruct;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.boot.autoconfigure.condition.ConditionalOnProperty;
import org.springframework.stereotype.Component;

import java.io.IOException;
import java.math.BigDecimal;
import java.nio.file.Files;
import java.nio.file.Path;
import java.util.Locale;
import java.util.Map;
import java.util.Set;
import java.util.concurrent.ConcurrentHashMap;

@Component
@ConditionalOnProperty(name = "dartchain.persistence.mode", havingValue = "memory", matchIfMissing = true)
public class JsonExchangeLedgerStore implements ExchangeLedgerStore {

    private static final Logger log = LoggerFactory.getLogger(JsonExchangeLedgerStore.class);
    private static final int SCALE = 8;

    private final ObjectMapper objectMapper;
    private final Path ledgerPath;

    private final Map<String, Map<String, BigDecimal>> adjustments = new ConcurrentHashMap<>();
    private final Set<String> seededWallets = ConcurrentHashMap.newKeySet();

    public JsonExchangeLedgerStore(
            ObjectMapper objectMapper,
            @Value("${exchange.ledger.path:data/exchange-ledger.json}") String ledgerPath
    ) {
        this.objectMapper = objectMapper;
        this.ledgerPath = Path.of(ledgerPath);
    }

    @PostConstruct
    public void loadFromDisk() {
        if (!Files.exists(ledgerPath)) {
            return;
        }

        try {
            ExchangeLedgerSnapshot snapshot = objectMapper.readValue(
                    Files.readString(ledgerPath),
                    ExchangeLedgerSnapshot.class
            );

            adjustments.clear();
            seededWallets.clear();

            snapshot.getAdjustments().forEach((wallet, tokenMap) -> {
                Map<String, BigDecimal> normalized = new ConcurrentHashMap<>();
                tokenMap.forEach((token, raw) -> {
                    BigDecimal value = parseAmount(raw);
                    if (value.compareTo(BigDecimal.ZERO) != 0) {
                        normalized.put(normalizeToken(token), value);
                    }
                });
                if (!normalized.isEmpty()) {
                    adjustments.put(normalizeWallet(wallet), normalized);
                }
            });

            snapshot.getSeededWallets().forEach(wallet -> seededWallets.add(normalizeWallet(wallet)));
        } catch (IOException exception) {
            throw new IllegalStateException("Unable to load exchange ledger from " + ledgerPath, exception);
        }
    }

    @Override
    public synchronized boolean markSeededIfAbsent(String walletAddress) {
        return seededWallets.add(normalizeWallet(walletAddress));
    }

    @Override
    public synchronized void applyAdjustment(String walletAddress, String token, BigDecimal delta) {
        String wallet = normalizeWallet(walletAddress);
        String normalizedToken = normalizeToken(token);
        Map<String, BigDecimal> walletAdjustments = adjustments.computeIfAbsent(
                wallet,
                ignored -> new ConcurrentHashMap<>()
        );

        BigDecimal next = walletAdjustments
                .getOrDefault(normalizedToken, BigDecimal.ZERO)
                .add(delta);

        if (next.compareTo(BigDecimal.ZERO) == 0) {
            walletAdjustments.remove(normalizedToken);
            if (walletAdjustments.isEmpty()) {
                adjustments.remove(wallet);
            }
        } else {
            walletAdjustments.put(normalizedToken, next.setScale(SCALE, java.math.RoundingMode.HALF_UP));
        }

        persist();
    }

    @Override
    public BigDecimal getAdjustment(String walletAddress, String token) {
        if (walletAddress == null || walletAddress.isBlank()) {
            return BigDecimal.ZERO.setScale(SCALE, java.math.RoundingMode.HALF_UP);
        }

        Map<String, BigDecimal> walletAdjustments = adjustments.get(normalizeWallet(walletAddress));
        if (walletAdjustments == null) {
            return BigDecimal.ZERO.setScale(SCALE, java.math.RoundingMode.HALF_UP);
        }

        return walletAdjustments
                .getOrDefault(normalizeToken(token), BigDecimal.ZERO)
                .setScale(SCALE, java.math.RoundingMode.HALF_UP);
    }

    private synchronized void persist() {
        try {
            Files.createDirectories(ledgerPath.getParent());

            ExchangeLedgerSnapshot snapshot = new ExchangeLedgerSnapshot();
            adjustments.forEach((wallet, tokenMap) -> {
                Map<String, String> serialized = new ConcurrentHashMap<>();
                tokenMap.forEach((token, value) ->
                        serialized.put(token, value.stripTrailingZeros().toPlainString())
                );
                snapshot.getAdjustments().put(wallet, serialized);
            });
            snapshot.setSeededWallets(seededWallets);

            objectMapper.writerWithDefaultPrettyPrinter().writeValue(ledgerPath.toFile(), snapshot);
        } catch (IOException exception) {
            log.warn(
                    "Unable to persist exchange ledger to {} (continuing in-memory): {}",
                    ledgerPath,
                    exception.getMessage()
            );
        }
    }

    private static BigDecimal parseAmount(String raw) {
        if (raw == null || raw.isBlank()) {
            return BigDecimal.ZERO;
        }
        return new BigDecimal(raw.trim());
    }

    private static String normalizeWallet(String walletAddress) {
        return walletAddress.trim().toLowerCase(Locale.ROOT);
    }

    private static String normalizeToken(String token) {
        return token.trim().toUpperCase(Locale.ROOT);
    }
}
