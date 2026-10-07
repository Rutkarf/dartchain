package io.dartchain.backend.auth.persistence;

import io.dartchain.backend.auth.store.RefreshTokenStore;
import io.dartchain.backend.config.AuthProperties;
import org.springframework.boot.autoconfigure.condition.ConditionalOnProperty;
import org.springframework.stereotype.Component;

import java.time.Instant;
import java.util.Map;
import java.util.Optional;
import java.util.UUID;
import java.util.concurrent.ConcurrentHashMap;

@Component
@ConditionalOnProperty(name = "dartchain.persistence.mode", havingValue = "memory", matchIfMissing = true)
public class InMemoryRefreshTokenStore implements RefreshTokenStore {

    private final AuthProperties authProperties;
    private final Map<String, Entry> tokens = new ConcurrentHashMap<>();

    public InMemoryRefreshTokenStore(AuthProperties authProperties) {
        this.authProperties = authProperties;
    }

    @Override
    public String create(String userId) {
        String token = UUID.randomUUID().toString();
        tokens.put(token, new Entry(userId, Instant.now().plusSeconds(authProperties.getRefreshTokenTtlSeconds())));
        return token;
    }

    @Override
    public Optional<String> resolveUserId(String refreshToken) {
        if (refreshToken == null || refreshToken.isBlank()) {
            return Optional.empty();
        }

        Entry entry = tokens.get(refreshToken.trim());
        if (entry == null) {
            return Optional.empty();
        }

        if (Instant.now().isAfter(entry.expiresAt())) {
            tokens.remove(refreshToken.trim());
            return Optional.empty();
        }

        return Optional.of(entry.userId());
    }

    @Override
    public void revoke(String refreshToken) {
        if (refreshToken != null) {
            tokens.remove(refreshToken.trim());
        }
    }

    private record Entry(String userId, Instant expiresAt) {
    }
}
