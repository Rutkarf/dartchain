package io.dartchain.backend.wallet;

import com.fasterxml.jackson.databind.ObjectMapper;
import io.dartchain.backend.wallet.store.WalletBalanceStore;
import jakarta.annotation.PostConstruct;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.boot.autoconfigure.condition.ConditionalOnProperty;
import org.springframework.stereotype.Component;

import java.io.IOException;
import java.math.BigDecimal;
import java.math.RoundingMode;
import java.nio.file.Files;
import java.nio.file.Path;
import java.util.ArrayList;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Locale;
import java.util.Map;
import java.util.Optional;
import java.util.concurrent.ConcurrentHashMap;

@Component
@ConditionalOnProperty(name = "dartchain.persistence.mode", havingValue = "memory", matchIfMissing = true)
public class JsonWalletBalanceStore implements WalletBalanceStore {

    private static final Logger log = LoggerFactory.getLogger(JsonWalletBalanceStore.class);
    private static final int SCALE = 26;

    private final ObjectMapper objectMapper;
    private final Path storePath;

    private final Map<String, Map<String, Snapshot>> balances = new ConcurrentHashMap<>();
    private final List<Map<String, String>> events = new ArrayList<>();

    public JsonWalletBalanceStore(
            ObjectMapper objectMapper,
            @Value("${wallet.balances.path:data/wallet-balances.json}") String storePath
    ) {
        this.objectMapper = objectMapper;
        this.storePath = Path.of(storePath);
    }

    @PostConstruct
    public void loadFromDisk() {
        if (!Files.exists(storePath)) {
            return;
        }

        try {
            WalletBalanceSnapshotFile file = objectMapper.readValue(
                    Files.readString(storePath),
                    WalletBalanceSnapshotFile.class
            );
            balances.clear();
            events.clear();
            if (file.getBalances() != null) {
                file.getBalances().forEach((wallet, tokenMap) -> {
                    Map<String, Snapshot> normalized = new ConcurrentHashMap<>();
                    tokenMap.forEach((token, row) -> normalized.put(
                            normalizeToken(token),
                            new Snapshot(
                                    normalizeWallet(wallet),
                                    normalizeToken(token),
                                    parse(row.getBalance()),
                                    parse(row.getChainBalance()),
                                    parse(row.getLedgerAdjustment()),
                                    row.getSource() != null ? row.getSource() : "SYNC"
                            )
                    ));
                    if (!normalized.isEmpty()) {
                        balances.put(normalizeWallet(wallet), normalized);
                    }
                });
            }
            if (file.getEvents() != null) {
                events.addAll(file.getEvents());
            }
        } catch (IOException exception) {
            throw new IllegalStateException("Unable to load wallet balances from " + storePath, exception);
        }
    }

    @Override
    public synchronized Optional<Snapshot> find(String walletAddress, String token) {
        Map<String, Snapshot> wallet = balances.get(normalizeWallet(walletAddress));
        if (wallet == null) {
            return Optional.empty();
        }
        return Optional.ofNullable(wallet.get(normalizeToken(token)));
    }

    @Override
    public synchronized List<Snapshot> listByWallet(String walletAddress) {
        Map<String, Snapshot> wallet = balances.get(normalizeWallet(walletAddress));
        if (wallet == null || wallet.isEmpty()) {
            return List.of();
        }
        return List.copyOf(wallet.values());
    }

    @Override
    public synchronized void upsertAndAudit(
            String walletAddress,
            String token,
            BigDecimal balance,
            BigDecimal chainBalance,
            BigDecimal ledgerAdjustment,
            String eventType,
            String reference
    ) {
        String wallet = normalizeWallet(walletAddress);
        String normalizedToken = normalizeToken(token);
        BigDecimal nextBalance = scale(balance);
        BigDecimal nextChain = scale(chainBalance);
        BigDecimal nextLedger = scale(ledgerAdjustment);

        Map<String, Snapshot> walletMap = balances.computeIfAbsent(wallet, ignored -> new ConcurrentHashMap<>());
        Snapshot previous = walletMap.get(normalizedToken);
        BigDecimal previousBalance = previous != null ? previous.balance() : BigDecimal.ZERO;

        boolean changed = previous == null
                || previousBalance.compareTo(nextBalance) != 0
                || previous.chainBalance().compareTo(nextChain) != 0
                || previous.ledgerAdjustment().compareTo(nextLedger) != 0;

        walletMap.put(
                normalizedToken,
                new Snapshot(
                        wallet,
                        normalizedToken,
                        nextBalance,
                        nextChain,
                        nextLedger,
                        eventType != null ? eventType : "SYNC"
                )
        );

        if (changed) {
            Map<String, String> event = new LinkedHashMap<>();
            event.put("walletAddress", wallet);
            event.put("token", normalizedToken);
            event.put("delta", nextBalance.subtract(previousBalance).stripTrailingZeros().toPlainString());
            event.put("balanceAfter", nextBalance.stripTrailingZeros().toPlainString());
            event.put("chainBalance", nextChain.stripTrailingZeros().toPlainString());
            event.put("ledgerAdjustment", nextLedger.stripTrailingZeros().toPlainString());
            event.put("eventType", eventType != null ? eventType : "SYNC");
            if (reference != null) {
                event.put("reference", reference);
            }
            event.put("createdAt", java.time.Instant.now().toString());
            events.add(event);
            if (events.size() > 5000) {
                events.subList(0, events.size() - 5000).clear();
            }
        }

        persist();
    }

    private synchronized void persist() {
        try {
            Files.createDirectories(storePath.getParent());
            WalletBalanceSnapshotFile file = new WalletBalanceSnapshotFile();
            balances.forEach((wallet, tokenMap) -> {
                Map<String, WalletBalanceSnapshotFile.Row> serialized = new LinkedHashMap<>();
                tokenMap.forEach((token, snapshot) -> {
                    WalletBalanceSnapshotFile.Row row = new WalletBalanceSnapshotFile.Row();
                    row.setBalance(snapshot.balance().stripTrailingZeros().toPlainString());
                    row.setChainBalance(snapshot.chainBalance().stripTrailingZeros().toPlainString());
                    row.setLedgerAdjustment(snapshot.ledgerAdjustment().stripTrailingZeros().toPlainString());
                    row.setSource(snapshot.source());
                    serialized.put(token, row);
                });
                file.getBalances().put(wallet, serialized);
            });
            file.setEvents(new ArrayList<>(events));
            objectMapper.writerWithDefaultPrettyPrinter().writeValue(storePath.toFile(), file);
        } catch (IOException exception) {
            log.warn(
                    "Unable to persist wallet balances to {} (continuing in-memory): {}",
                    storePath,
                    exception.getMessage()
            );
        }
    }

    private static BigDecimal scale(BigDecimal value) {
        BigDecimal safe = value != null ? value : BigDecimal.ZERO;
        return safe.setScale(SCALE, RoundingMode.HALF_UP);
    }

    private static BigDecimal parse(String raw) {
        if (raw == null || raw.isBlank()) {
            return BigDecimal.ZERO.setScale(SCALE, RoundingMode.HALF_UP);
        }
        return new BigDecimal(raw.trim()).setScale(SCALE, RoundingMode.HALF_UP);
    }

    private static String normalizeWallet(String walletAddress) {
        return walletAddress.trim().toLowerCase(Locale.ROOT);
    }

    private static String normalizeToken(String token) {
        return token.trim().toUpperCase(Locale.ROOT);
    }
}
