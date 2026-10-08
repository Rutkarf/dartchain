package io.dartchain.backend.access.application;

import io.dartchain.backend.persistence.entity.IpBanEntity;
import io.dartchain.backend.persistence.repository.IpBanJpaRepository;
import org.springframework.boot.autoconfigure.condition.ConditionalOnProperty;
import org.springframework.stereotype.Component;
import org.springframework.transaction.annotation.Transactional;

import java.time.Instant;

@Component
@ConditionalOnProperty(name = "dartchain.persistence.mode", havingValue = "postgres")
public class JpaIpBanStore implements IpBanStore {

    private final IpBanJpaRepository repository;

    public JpaIpBanStore(IpBanJpaRepository repository) {
        this.repository = repository;
    }

    @Override
    public boolean exists(String ipAddress) {
        return repository.existsByIpAddress(ipAddress);
    }

    @Override
    @Transactional
    public void save(String ipAddress, String reason, String userAgent) {
        if (repository.existsByIpAddress(ipAddress)) {
            return;
        }
        IpBanEntity entity = new IpBanEntity();
        entity.setIpAddress(ipAddress);
        entity.setReason(reason == null || reason.isBlank() ? "age_decline" : reason.trim());
        entity.setCreatedAt(Instant.now());
        if (userAgent != null && !userAgent.isBlank()) {
            entity.setUserAgent(userAgent.length() > 512 ? userAgent.substring(0, 512) : userAgent);
        }
        repository.save(entity);
    }
}
