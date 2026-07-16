package io.dartchain.backend.persistence.repository;

import io.dartchain.backend.persistence.entity.ChainConfigEntity;
import org.springframework.data.jpa.repository.JpaRepository;

public interface ChainConfigRepository extends JpaRepository<ChainConfigEntity, String> {
}
