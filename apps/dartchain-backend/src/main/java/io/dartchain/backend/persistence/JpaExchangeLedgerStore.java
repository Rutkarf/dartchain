package io.dartchain.backend.persistence;

import io.dartchain.backend.exchange.store.ExchangeLedgerStore;
import io.dartchain.backend.persistence.entity.ExchangeLedgerAdjustmentEntity;
import io.dartchain.backend.persistence.entity.ExchangeLedgerAdjustmentId;
import io.dartchain.backend.persistence.entity.ExchangeSeededWalletEntity;
import io.dartchain.backend.persistence.repository.ExchangeLedgerAdjustmentJpaRepository;
import io.dartchain.backend.persistence.repository.ExchangeSeededWalletJpaRepository;
import org.springframework.boot.autoconfigure.condition.ConditionalOnProperty;
import org.springframework.stereotype.Component;
import org.springframework.transaction.annotation.Transactional;

import java.math.BigDecimal;
import java.math.RoundingMode;
import java.util.Locale;

@Component
@ConditionalOnProperty(name = "dartchain.persistence.mode", havingValue = "postgres")
public class JpaExchangeLedgerStore implements ExchangeLedgerStore {

    private static final int SCALE = 8;

    private final ExchangeLedgerAdjustmentJpaRepository adjustmentRepository;
    private final ExchangeSeededWalletJpaRepository seededWalletRepository;

    public JpaExchangeLedgerStore(
            ExchangeLedgerAdjustmentJpaRepository adjustmentRepository,
            ExchangeSeededWalletJpaRepository seededWalletRepository
    ) {
        this.adjustmentRepository = adjustmentRepository;
        this.seededWalletRepository = seededWalletRepository;
    }

    @Override
    @Transactional
    public boolean markSeededIfAbsent(String walletAddress) {
        String wallet = normalizeWallet(walletAddress);
        if (seededWalletRepository.existsById(wallet)) {
            return false;
        }

        ExchangeSeededWalletEntity entity = new ExchangeSeededWalletEntity();
        entity.setWalletAddress(wallet);
        seededWalletRepository.save(entity);
        return true;
    }

    @Override
    @Transactional
    public void applyAdjustment(String walletAddress, String token, BigDecimal delta) {
        String wallet = normalizeWallet(walletAddress);
        String normalizedToken = normalizeToken(token);
        ExchangeLedgerAdjustmentId id = new ExchangeLedgerAdjustmentId(wallet, normalizedToken);

        BigDecimal current = adjustmentRepository.findById(id)
                .map(ExchangeLedgerAdjustmentEntity::getAdjustment)
                .orElse(BigDecimal.ZERO);
        BigDecimal next = current.add(delta);

        if (next.compareTo(BigDecimal.ZERO) == 0) {
            adjustmentRepository.deleteById(id);
            return;
        }

        ExchangeLedgerAdjustmentEntity entity = adjustmentRepository.findById(id)
                .orElseGet(() -> {
                    ExchangeLedgerAdjustmentEntity created = new ExchangeLedgerAdjustmentEntity();
                    created.setId(id);
                    return created;
                });
        entity.setAdjustment(next.setScale(SCALE, RoundingMode.HALF_UP));
        adjustmentRepository.save(entity);
    }

    @Override
    @Transactional(readOnly = true)
    public BigDecimal getAdjustment(String walletAddress, String token) {
        if (walletAddress == null || walletAddress.isBlank()) {
            return BigDecimal.ZERO.setScale(SCALE, RoundingMode.HALF_UP);
        }

        ExchangeLedgerAdjustmentId id = new ExchangeLedgerAdjustmentId(
                normalizeWallet(walletAddress),
                normalizeToken(token)
        );

        return adjustmentRepository.findById(id)
                .map(ExchangeLedgerAdjustmentEntity::getAdjustment)
                .orElse(BigDecimal.ZERO)
                .setScale(SCALE, RoundingMode.HALF_UP);
    }

    private static String normalizeWallet(String walletAddress) {
        return walletAddress.trim().toLowerCase(Locale.ROOT);
    }

    private static String normalizeToken(String token) {
        return token.trim().toUpperCase(Locale.ROOT);
    }
}
