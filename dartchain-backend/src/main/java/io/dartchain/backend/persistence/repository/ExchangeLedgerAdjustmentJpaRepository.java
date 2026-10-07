package io.dartchain.backend.persistence.repository;

import io.dartchain.backend.persistence.entity.ExchangeLedgerAdjustmentEntity;
import io.dartchain.backend.persistence.entity.ExchangeLedgerAdjustmentId;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;

public interface ExchangeLedgerAdjustmentJpaRepository
        extends JpaRepository<ExchangeLedgerAdjustmentEntity, ExchangeLedgerAdjustmentId> {

    List<ExchangeLedgerAdjustmentEntity> findByIdWalletAddress(String walletAddress);
}
