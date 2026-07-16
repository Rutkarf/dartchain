package io.dartchain.backend.persistence.repository;

import io.dartchain.backend.persistence.entity.ExchangeSeededWalletEntity;
import org.springframework.data.jpa.repository.JpaRepository;

public interface ExchangeSeededWalletJpaRepository extends JpaRepository<ExchangeSeededWalletEntity, String> {
}
