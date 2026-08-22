package io.dartchain.backend.auth.persistence;

import io.dartchain.backend.auth.store.SessionStore;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.boot.autoconfigure.condition.ConditionalOnProperty;
import org.springframework.stereotype.Component;

import java.time.Instant;
import java.util.Map;
import java.util.Optional;
import java.util.UUID;
import java.util.concurrent.ConcurrentHashMap;

@Component
@ConditionalOnProperty(name = "dartchain.persistence.mode", havingValue = "memory", matchIfMissing = true)
public class InMemorySessionStore implements SessionStore {

    private record SessionEntry(String userId, Instant expiresAt) {
        boolean isExpired() {
            return Instant.now().isAfter(expiresAt);
        }
    }

    private final Map<String, SessionEntry> sessions = new ConcurrentHashMap<>();
    private final long ttlSeconds;

    public InMemorySessionStore(@Value("${auth.session.ttl-seconds:604800}") long ttlSeconds) {
        this.ttlSeconds = ttlSeconds;
    }

    @Override
    public String createSession(String userId) {
        String token = UUID.randomUUID().toString();
        sessions.put(token, new SessionEntry(userId, Instant.now().plusSeconds(ttlSeconds)));
        return token;
    }

    @Override
    public Optional<String> resolveUserId(String token) {
        if (token == null || token.isBlank()) {
            return Optional.empty();
        }

        SessionEntry entry = sessions.get(token.trim());
        if (entry == null) {
            return Optional.empty();
        }

        if (entry.isExpired()) {
            sessions.remove(token.trim());
            return Optional.empty();
        }

        return Optional.of(entry.userId());
    }

    @Override
    public void revoke(String token) {
        if (token != null && !token.isBlank()) {
            sessions.remove(token.trim());
        }
    }
}
