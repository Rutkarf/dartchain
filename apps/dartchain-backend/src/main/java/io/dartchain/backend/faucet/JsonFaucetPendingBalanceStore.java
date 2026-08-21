package io.dartchain.backend.faucet;

import com.fasterxml.jackson.databind.ObjectMapper;
import io.dartchain.backend.faucet.store.FaucetPendingBalanceStore;
import jakarta.annotation.PostConstruct;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Component;

import java.io.IOException;
import java.math.BigDecimal;
import java.nio.file.Files;
import java.nio.file.Path;
import java.util.HashMap;
import java.util.Map;
import java.util.concurrent.ConcurrentHashMap;

/**
 * Pending faucet balances — JSON file (valable mémoire et postgres local).
 * Les pièces M4T3R y sont accrues sans créer de bloc.
 */
@Component
public class JsonFaucetPendingBalanceStore implements FaucetPendingBalanceStore {

    private static final Logger log = LoggerFactory.getLogger(JsonFaucetPendingBalanceStore.class);

    private final ObjectMapper objectMapper;
    private final Path storePath;
    private final ConcurrentHashMap<String, BigDecimal> balances = new ConcurrentHashMap<>();

    public JsonFaucetPendingBalanceStore(
            ObjectMapper objectMapper,
            @Value("${faucet.pending.path:data/faucet-pending.json}") String storePath
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
            FaucetPendingSnapshot snapshot = objectMapper.readValue(
                    Files.readString(storePath),
                    FaucetPendingSnapshot.class
            );
            balances.clear();
            if (snapshot.getBalances() != null) {
                snapshot.getBalances().forEach((wallet, amount) -> {
                    if (wallet != null && amount != null) {
                        balances.put(wallet.toLowerCase(), amount);
                    }
                });
            }
        } catch (IOException exception) {
            throw new IllegalStateException("Unable to load faucet pending from " + storePath, exception);
        }
    }

    @Override
    public synchronized BigDecimal get(String walletAddress) {
        if (walletAddress == null || walletAddress.isBlank()) {
            return BigDecimal.ZERO;
        }
        return balances.getOrDefault(walletAddress.toLowerCase(), BigDecimal.ZERO);
    }

    @Override
    public synchronized BigDecimal add(String walletAddress, BigDecimal amount) {
        if (walletAddress == null || walletAddress.isBlank()) {
            throw new IllegalArgumentException("walletAddress required");
        }
        if (amount == null || amount.compareTo(BigDecimal.ZERO) <= 0) {
            return get(walletAddress);
        }
        String key = walletAddress.toLowerCase();
        BigDecimal next = get(key).add(amount);
        balances.put(key, next);
        persistToDisk();
        return next;
    }

    @Override
    public synchronized BigDecimal debit(String walletAddress, BigDecimal amount) {
        if (walletAddress == null || walletAddress.isBlank() || amount == null
                || amount.compareTo(BigDecimal.ZERO) <= 0) {
            return BigDecimal.ZERO;
        }
        String key = walletAddress.toLowerCase();
        BigDecimal current = get(key);
        if (current.compareTo(BigDecimal.ZERO) <= 0) {
            return BigDecimal.ZERO;
        }
        BigDecimal debited = amount.min(current);
        BigDecimal remaining = current.subtract(debited);
        if (remaining.compareTo(BigDecimal.ZERO) <= 0) {
            balances.remove(key);
        } else {
            balances.put(key, remaining);
        }
        persistToDisk();
        return debited;
    }

    private void persistToDisk() {
        try {
            if (storePath.getParent() != null) {
                Files.createDirectories(storePath.getParent());
            }
            FaucetPendingSnapshot snapshot = new FaucetPendingSnapshot();
            snapshot.setBalances(new HashMap<>(balances));
            objectMapper.writerWithDefaultPrettyPrinter().writeValue(storePath.toFile(), snapshot);
        } catch (IOException exception) {
            log.warn("Unable to persist faucet pending to {}: {}", storePath, exception.getMessage());
        }
    }

    public static class FaucetPendingSnapshot {
        private Map<String, BigDecimal> balances = new HashMap<>();

        public Map<String, BigDecimal> getBalances() {
            return balances;
        }

        public void setBalances(Map<String, BigDecimal> balances) {
            this.balances = balances != null ? balances : new HashMap<>();
        }
    }
}
