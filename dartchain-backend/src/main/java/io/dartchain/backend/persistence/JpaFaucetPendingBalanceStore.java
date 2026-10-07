package io.dartchain.backend.persistence;

import io.dartchain.backend.faucet.store.FaucetPendingBalanceStore;
import io.dartchain.backend.persistence.entity.FaucetPendingBalanceEntity;
import io.dartchain.backend.persistence.repository.FaucetPendingBalanceJpaRepository;
import org.springframework.boot.autoconfigure.condition.ConditionalOnProperty;
import org.springframework.stereotype.Component;
import org.springframework.transaction.annotation.Transactional;

import java.math.BigDecimal;

@Component
@ConditionalOnProperty(name = "dartchain.persistence.mode", havingValue = "postgres")
public class JpaFaucetPendingBalanceStore implements FaucetPendingBalanceStore {

    private final FaucetPendingBalanceJpaRepository repository;

    public JpaFaucetPendingBalanceStore(FaucetPendingBalanceJpaRepository repository) {
        this.repository = repository;
    }

    @Override
    @Transactional(readOnly = true)
    public BigDecimal get(String walletAddress) {
        if (walletAddress == null || walletAddress.isBlank()) {
            return BigDecimal.ZERO;
        }
        return repository.findById(walletAddress.toLowerCase())
                .map(FaucetPendingBalanceEntity::getAmount)
                .orElse(BigDecimal.ZERO);
    }

    @Override
    @Transactional
    public BigDecimal add(String walletAddress, BigDecimal amount) {
        if (walletAddress == null || walletAddress.isBlank()) {
            throw new IllegalArgumentException("walletAddress required");
        }
        if (amount == null || amount.compareTo(BigDecimal.ZERO) <= 0) {
            return get(walletAddress);
        }
        String key = walletAddress.toLowerCase();
        BigDecimal next = get(key).add(amount);
        FaucetPendingBalanceEntity entity = new FaucetPendingBalanceEntity();
        entity.setWalletAddress(key);
        entity.setAmount(next);
        repository.save(entity);
        return next;
    }

    @Override
    @Transactional
    public BigDecimal debit(String walletAddress, BigDecimal amount) {
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
            repository.deleteById(key);
        } else {
            FaucetPendingBalanceEntity entity = new FaucetPendingBalanceEntity();
            entity.setWalletAddress(key);
            entity.setAmount(remaining);
            repository.save(entity);
        }
        return debited;
    }
}
