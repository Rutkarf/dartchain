package io.dartchain.backend.persistence.repository;

import io.dartchain.backend.persistence.entity.ExchangeLedgerAdjustmentEntity;
import io.dartchain.backend.persistence.entity.ExchangeLedgerAdjustmentId;
import org.springframework.data.jpa.repository.JpaRepository;

public interface ExchangeLedgerAdjustmentJpaRepository
        extends JpaRepository<ExchangeLedgerAdjustmentEntity, ExchangeLedgerAdjustmentId> {
}
