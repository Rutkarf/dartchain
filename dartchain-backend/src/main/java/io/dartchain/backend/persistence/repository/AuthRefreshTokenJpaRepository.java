package io.dartchain.backend.persistence.repository;

import io.dartchain.backend.persistence.entity.AuthRefreshTokenEntity;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.UUID;

public interface AuthRefreshTokenJpaRepository extends JpaRepository<AuthRefreshTokenEntity, UUID> {
}
