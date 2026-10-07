package io.dartchain.backend.persistence.repository;

import io.dartchain.backend.persistence.entity.AuthAuditLogEntity;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.UUID;

public interface AuthAuditLogJpaRepository extends JpaRepository<AuthAuditLogEntity, UUID> {
}
