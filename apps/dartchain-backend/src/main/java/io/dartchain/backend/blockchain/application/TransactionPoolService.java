package io.dartchain.backend.blockchain.application;

import io.dartchain.backend.blockchain.store.BlockchainStateStore;
import io.dartchain.backend.blockchain.model.PendingTransaction;
import io.dartchain.backend.blockchain.model.Transaction;
import jakarta.annotation.PostConstruct;
import org.springframework.stereotype.Service;

import java.math.BigDecimal;
import java.util.ArrayList;
import java.util.List;
import java.util.Objects;

/**
 * Single in-memory mempool shared by REST, P2P, live WS and mining.
 */
@Service
public class TransactionPoolService {

    private final BlockchainStateStore blockchainStateStore;
    private final List<PendingTransaction> pool = new ArrayList<>();

    public TransactionPoolService(BlockchainStateStore blockchainStateStore) {
        this.blockchainStateStore = blockchainStateStore;
    }

    @PostConstruct
    public void loadFromStore() {
        synchronized (this) {
            pool.clear();
            List<PendingTransaction> loaded = blockchainStateStore.load().getPendingPool();
            if (loaded != null) {
                pool.addAll(loaded);
            }
        }
    }

    public synchronized List<PendingTransaction> getAll() {
        return List.copyOf(pool);
    }

    public synchronized List<PendingTransaction> getPendingOnly() {
        return pool.stream()
                .filter(this::isPending)
                .toList();
    }

    public synchronized PendingTransaction add(PendingTransaction transaction) {
        Objects.requireNonNull(transaction, "transaction must not be null");

        if (exists(transaction)) {
            throw new IllegalStateException("Transaction already in pool: " + transaction.getId());
        }

        pool.add(transaction);
        persistPool();
        return transaction;
    }

    public synchronized boolean addIfAbsent(PendingTransaction transaction) {
        if (transaction == null || exists(transaction)) {
            return false;
        }

        pool.add(transaction);
        persistPool();
        return true;
    }

    public synchronized PendingTransaction findById(String id) {
        if (id == null || id.isBlank()) {
            return null;
        }

        return pool.stream()
                .filter(tx -> id.equals(tx.getId()))
                .findFirst()
                .orElse(null);
    }

    public synchronized boolean removeById(String id) {
        if (id == null || id.isBlank()) {
            return false;
        }

        boolean removed = pool.removeIf(tx -> id.equals(tx.getId()));
        if (removed) {
            persistPool();
        }
        return removed;
    }

    public synchronized List<PendingTransaction> drainAll() {
        List<PendingTransaction> drained = List.copyOf(pool);
        pool.clear();
        persistPool();
        return drained;
    }

    public synchronized void clear() {
        pool.clear();
        persistPool();
    }

    public synchronized BigDecimal getPendingOutgoingAmount(String address) {
        if (address == null || address.isBlank()) {
            return BigDecimal.ZERO;
        }

        BigDecimal total = BigDecimal.ZERO;

        for (PendingTransaction tx : pool) {
            if (tx == null || tx.getAmount() == null) {
                continue;
            }

            if (address.equals(tx.getFromAddress())) {
                total = total.add(tx.getAmount());
            }
        }

        return total;
    }

    public static PendingTransaction fromTransaction(Transaction transaction) {
        PendingTransaction pending = new PendingTransaction();
        pending.setId(transaction.getId());
        pending.setHash(transaction.getHash());
        pending.setFromAddress(transaction.getSender());
        pending.setToAddress(transaction.getRecipient());
        pending.setAmount(transaction.getAmount());
        pending.setData(transaction.getPayload() != null ? transaction.getPayload() : "");
        pending.setSignature(transaction.getSignature());
        pending.setStatus(transaction.getStatus() != null ? transaction.getStatus() : "PENDING");
        pending.setCreatedAt(transaction.getTimestamp());
        pending.setSystemReward(
                transaction.getSystemReward() != null ? transaction.getSystemReward() : false
        );
        return pending;
    }

    public static Transaction toTransaction(PendingTransaction pending) {
        Transaction transaction = new Transaction();
        transaction.setId(pending.getId());
        transaction.setHash(pending.getHash());
        transaction.setSender(pending.getFromAddress());
        transaction.setRecipient(pending.getToAddress());
        transaction.setAmount(pending.getAmount());
        transaction.setTimestamp(pending.getCreatedAt());
        transaction.setSignature(pending.getSignature());
        transaction.setPayload(pending.getData());
        transaction.setStatus(pending.getStatus());
        transaction.setSystemReward(
                pending.getSystemReward() != null ? pending.getSystemReward() : false
        );
        return transaction;
    }

    private boolean exists(PendingTransaction transaction) {
        return pool.stream().anyMatch(existing ->
                existing.getId().equals(transaction.getId())
                        || (existing.getHash() != null
                        && existing.getHash().equals(transaction.getHash()))
        );
    }

    private boolean isPending(PendingTransaction transaction) {
        return transaction.getStatus() == null
                || "PENDING".equalsIgnoreCase(transaction.getStatus().trim());
    }

    private void persistPool() {
        blockchainStateStore.savePendingPool(List.copyOf(pool));
    }
}
