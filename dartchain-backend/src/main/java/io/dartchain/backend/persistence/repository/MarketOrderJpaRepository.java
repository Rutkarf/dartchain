package io.dartchain.backend.persistence.repository;

import io.dartchain.backend.persistence.entity.MarketOrderEntity;
import org.springframework.data.jpa.repository.JpaRepository;

public interface MarketOrderJpaRepository extends JpaRepository<MarketOrderEntity, String> {}
