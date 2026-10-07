package io.dartchain.backend.persistence.repository;

import io.dartchain.backend.persistence.entity.FaucetPendingBalanceEntity;
import org.springframework.data.jpa.repository.JpaRepository;

public interface FaucetPendingBalanceJpaRepository extends JpaRepository<FaucetPendingBalanceEntity, String> {
}
