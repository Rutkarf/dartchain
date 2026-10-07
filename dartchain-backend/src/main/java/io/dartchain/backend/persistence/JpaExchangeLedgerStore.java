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
import java.time.Instant;
import java.util.LinkedHashMap;
import java.util.Locale;
import java.util.Map;

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

        Instant now = Instant.now();
        ExchangeLedgerAdjustmentEntity entity = adjustmentRepository.findById(id)
                .orElseGet(() -> {
                    ExchangeLedgerAdjustmentEntity created = new ExchangeLedgerAdjustmentEntity();
                    created.setId(id);
                    created.setCreatedAt(now);
                    return created;
                });
        entity.setAdjustment(next.setScale(SCALE, RoundingMode.HALF_UP));
        entity.setUpdatedAt(now);
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

    @Override
    @Transactional(readOnly = true)
    public Map<String, BigDecimal> listAdjustments(String walletAddress) {
        if (walletAddress == null || walletAddress.isBlank()) {
            return Map.of();
        }

        Map<String, BigDecimal> result = new LinkedHashMap<>();
        for (ExchangeLedgerAdjustmentEntity entity
                : adjustmentRepository.findByIdWalletAddress(normalizeWallet(walletAddress))) {
            if (entity.getId() == null || entity.getAdjustment() == null) {
                continue;
            }
            if (entity.getAdjustment().compareTo(BigDecimal.ZERO) == 0) {
                continue;
            }
            result.put(
                    entity.getId().getToken(),
                    entity.getAdjustment().setScale(SCALE, RoundingMode.HALF_UP)
            );
        }
        return result;
    }

    private static String normalizeWallet(String walletAddress) {
        return walletAddress.trim().toLowerCase(Locale.ROOT);
    }

    private static String normalizeToken(String token) {
        return token.trim().toUpperCase(Locale.ROOT);
    }
}
