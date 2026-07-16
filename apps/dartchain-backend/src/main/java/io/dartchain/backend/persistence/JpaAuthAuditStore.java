package io.dartchain.backend.persistence;

import io.dartchain.backend.auth.audit.AuthAuditStore;
import io.dartchain.backend.persistence.entity.AuthAuditLogEntity;
import io.dartchain.backend.persistence.repository.AuthAuditLogJpaRepository;
import org.springframework.boot.autoconfigure.condition.ConditionalOnProperty;
import org.springframework.stereotype.Component;
import org.springframework.transaction.annotation.Transactional;

import java.time.Instant;
import java.util.UUID;

@Component
@ConditionalOnProperty(name = "dartchain.persistence.mode", havingValue = "postgres")
public class JpaAuthAuditStore implements AuthAuditStore {

    private final AuthAuditLogJpaRepository repository;

    public JpaAuthAuditStore(AuthAuditLogJpaRepository repository) {
        this.repository = repository;
    }

    @Override
    @Transactional
    public void record(String userId, String action, String detail, String ipAddress) {
        AuthAuditLogEntity entity = new AuthAuditLogEntity();
        entity.setId(UUID.randomUUID());
        entity.setAction(action);
        entity.setDetail(detail);
        entity.setIpAddress(ipAddress);
        entity.setCreatedAt(Instant.now());

        if (userId != null && !userId.isBlank()) {
            try {
                entity.setUserId(UUID.fromString(userId));
            } catch (IllegalArgumentException ignored) {
                entity.setUserId(null);
            }
        }

        repository.save(entity);
    }
}
