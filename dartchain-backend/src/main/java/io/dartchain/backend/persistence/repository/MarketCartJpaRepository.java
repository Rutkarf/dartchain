package io.dartchain.backend.persistence.repository;

import io.dartchain.backend.persistence.entity.MarketCartEntity;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.Optional;

public interface MarketCartJpaRepository extends JpaRepository<MarketCartEntity, String> {
    Optional<MarketCartEntity> findByUserId(String userId);
}
