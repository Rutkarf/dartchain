package io.dartchain.backend.persistence;

import io.dartchain.backend.auth.store.RefreshTokenStore;
import io.dartchain.backend.config.AuthProperties;
import io.dartchain.backend.persistence.entity.AuthRefreshTokenEntity;
import io.dartchain.backend.persistence.repository.AuthRefreshTokenJpaRepository;
import org.springframework.boot.autoconfigure.condition.ConditionalOnProperty;
import org.springframework.stereotype.Component;
import org.springframework.transaction.annotation.Transactional;

import java.time.Instant;
import java.util.Optional;
import java.util.UUID;

@Component
@ConditionalOnProperty(name = "dartchain.persistence.mode", havingValue = "postgres")
public class JpaRefreshTokenStore implements RefreshTokenStore {

    private final AuthRefreshTokenJpaRepository repository;
    private final AuthProperties authProperties;

    public JpaRefreshTokenStore(AuthRefreshTokenJpaRepository repository, AuthProperties authProperties) {
        this.repository = repository;
        this.authProperties = authProperties;
    }

    @Override
    @Transactional
    public String create(String userId) {
        UUID token = UUID.randomUUID();
        Instant now = Instant.now();

        AuthRefreshTokenEntity entity = new AuthRefreshTokenEntity();
        entity.setToken(token);
        entity.setUserId(UUID.fromString(userId));
        entity.setCreatedAt(now);
        entity.setExpiresAt(now.plusSeconds(authProperties.getRefreshTokenTtlSeconds()));

        repository.save(entity);
        return token.toString();
    }

    @Override
    @Transactional
    public Optional<String> resolveUserId(String refreshToken) {
        if (refreshToken == null || refreshToken.isBlank()) {
            return Optional.empty();
        }

        UUID tokenId;
        try {
            tokenId = UUID.fromString(refreshToken.trim());
        } catch (IllegalArgumentException exception) {
            return Optional.empty();
        }

        return repository.findById(tokenId)
                .flatMap(entry -> {
                    if (Instant.now().isAfter(entry.getExpiresAt())) {
                        repository.delete(entry);
                        return Optional.empty();
                    }
                    return Optional.of(entry.getUserId().toString());
                });
    }

    @Override
    @Transactional
    public void revoke(String refreshToken) {
        if (refreshToken == null || refreshToken.isBlank()) {
            return;
        }

        try {
            repository.deleteById(UUID.fromString(refreshToken.trim()));
        } catch (IllegalArgumentException ignored) {
            // Invalid token format.
        }
    }
}
