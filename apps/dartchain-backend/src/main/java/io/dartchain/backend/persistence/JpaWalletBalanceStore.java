package io.dartchain.backend.persistence;

import io.dartchain.backend.persistence.entity.WalletBalanceEntity;
import io.dartchain.backend.persistence.entity.WalletBalanceEventEntity;
import io.dartchain.backend.persistence.entity.WalletBalanceId;
import io.dartchain.backend.persistence.repository.WalletBalanceEventJpaRepository;
import io.dartchain.backend.persistence.repository.WalletBalanceJpaRepository;
import io.dartchain.backend.wallet.store.WalletBalanceStore;
import org.springframework.boot.autoconfigure.condition.ConditionalOnProperty;
import org.springframework.stereotype.Component;
import org.springframework.transaction.annotation.Transactional;

import java.math.BigDecimal;
import java.math.RoundingMode;
import java.time.Instant;
import java.util.List;
import java.util.Locale;
import java.util.Optional;
import java.util.UUID;

@Component
@ConditionalOnProperty(name = "dartchain.persistence.mode", havingValue = "postgres")
public class JpaWalletBalanceStore implements WalletBalanceStore {

    private static final int SCALE = 26;

    private final WalletBalanceJpaRepository balanceRepository;
    private final WalletBalanceEventJpaRepository eventRepository;

    public JpaWalletBalanceStore(
            WalletBalanceJpaRepository balanceRepository,
            WalletBalanceEventJpaRepository eventRepository
    ) {
        this.balanceRepository = balanceRepository;
        this.eventRepository = eventRepository;
    }

    @Override
    @Transactional(readOnly = true)
    public Optional<Snapshot> find(String walletAddress, String token) {
        return balanceRepository
                .findById(new WalletBalanceId(normalizeWallet(walletAddress), normalizeToken(token)))
                .map(this::toSnapshot);
    }

    @Override
    @Transactional(readOnly = true)
    public List<Snapshot> listByWallet(String walletAddress) {
        return balanceRepository.findByIdWalletAddress(normalizeWallet(walletAddress)).stream()
                .map(this::toSnapshot)
                .toList();
    }

    @Override
    @Transactional
    public void upsertAndAudit(
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
        WalletBalanceId id = new WalletBalanceId(wallet, normalizedToken);

        BigDecimal nextBalance = scale(balance);
        BigDecimal nextChain = scale(chainBalance);
        BigDecimal nextLedger = scale(ledgerAdjustment);

        WalletBalanceEntity entity = balanceRepository.findById(id).orElseGet(() -> {
            WalletBalanceEntity created = new WalletBalanceEntity();
            created.setId(id);
            created.setCreatedAt(Instant.now());
            return created;
        });

        BigDecimal previous = entity.getBalance() != null ? entity.getBalance() : BigDecimal.ZERO;
        boolean changed = previous.compareTo(nextBalance) != 0
                || entity.getChainBalance() == null
                || entity.getChainBalance().compareTo(nextChain) != 0
                || entity.getLedgerAdjustment() == null
                || entity.getLedgerAdjustment().compareTo(nextLedger) != 0;

        entity.setBalance(nextBalance);
        entity.setChainBalance(nextChain);
        entity.setLedgerAdjustment(nextLedger);
        entity.setSource(eventType != null ? eventType : "SYNC");
        entity.setUpdatedAt(Instant.now());
        balanceRepository.save(entity);

        if (!changed) {
            return;
        }

        WalletBalanceEventEntity event = new WalletBalanceEventEntity();
        event.setId(UUID.randomUUID());
        event.setWalletAddress(wallet);
        event.setToken(normalizedToken);
        event.setDelta(nextBalance.subtract(previous).setScale(SCALE, RoundingMode.HALF_UP));
        event.setBalanceAfter(nextBalance);
        event.setChainBalance(nextChain);
        event.setLedgerAdjustment(nextLedger);
        event.setEventType(eventType != null ? eventType : "SYNC");
        event.setReference(reference);
        event.setCreatedAt(Instant.now());
        eventRepository.save(event);
    }

    private Snapshot toSnapshot(WalletBalanceEntity entity) {
        return new Snapshot(
                entity.getId().getWalletAddress(),
                entity.getId().getToken(),
                entity.getBalance(),
                entity.getChainBalance(),
                entity.getLedgerAdjustment(),
                entity.getSource()
        );
    }

    private static BigDecimal scale(BigDecimal value) {
        BigDecimal safe = value != null ? value : BigDecimal.ZERO;
        return safe.setScale(SCALE, RoundingMode.HALF_UP);
    }

    private static String normalizeWallet(String walletAddress) {
        return walletAddress.trim().toLowerCase(Locale.ROOT);
    }

    private static String normalizeToken(String token) {
        return token.trim().toUpperCase(Locale.ROOT);
    }
}
