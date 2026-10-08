package io.dartchain.backend.persistence.repository;

import io.dartchain.backend.persistence.entity.WalletBalanceEventEntity;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.UUID;

public interface WalletBalanceEventJpaRepository extends JpaRepository<WalletBalanceEventEntity, UUID> {
}
