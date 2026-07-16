package io.dartchain.backend.persistence;

import io.dartchain.backend.auth.store.SessionStore;
import io.dartchain.backend.persistence.entity.AuthSessionEntity;
import io.dartchain.backend.persistence.repository.AuthSessionJpaRepository;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.boot.autoconfigure.condition.ConditionalOnProperty;
import org.springframework.stereotype.Component;
import org.springframework.transaction.annotation.Transactional;

import java.time.Instant;
import java.util.Optional;
import java.util.UUID;

@Component
@ConditionalOnProperty(name = "dartchain.persistence.mode", havingValue = "postgres")
public class JpaSessionStore implements SessionStore {

    private final AuthSessionJpaRepository sessionRepository;
    private final long ttlSeconds;

    public JpaSessionStore(
            AuthSessionJpaRepository sessionRepository,
            @Value("${auth.session.ttl-seconds:604800}") long ttlSeconds
    ) {
        this.sessionRepository = sessionRepository;
        this.ttlSeconds = ttlSeconds;
    }

    @Override
    @Transactional
    public String createSession(String userId) {
        UUID token = UUID.randomUUID();
        Instant now = Instant.now();

        AuthSessionEntity session = new AuthSessionEntity();
        session.setToken(token);
        session.setUserId(UUID.fromString(userId));
        session.setCreatedAt(now);
        session.setExpiresAt(now.plusSeconds(ttlSeconds));

        sessionRepository.save(session);
        return token.toString();
    }

    @Override
    @Transactional
    public Optional<String> resolveUserId(String token) {
        if (token == null || token.isBlank()) {
            return Optional.empty();
        }

        UUID sessionToken;
        try {
            sessionToken = UUID.fromString(token.trim());
        } catch (IllegalArgumentException exception) {
            return Optional.empty();
        }

        Optional<AuthSessionEntity> session = sessionRepository.findById(sessionToken);
        if (session.isEmpty()) {
            return Optional.empty();
        }

        AuthSessionEntity entry = session.get();
        if (Instant.now().isAfter(entry.getExpiresAt())) {
            sessionRepository.delete(entry);
            return Optional.empty();
        }

        return Optional.of(entry.getUserId().toString());
    }

    @Override
    @Transactional
    public void revoke(String token) {
        if (token == null || token.isBlank()) {
            return;
        }

        try {
            sessionRepository.deleteById(UUID.fromString(token.trim()));
        } catch (IllegalArgumentException ignored) {
            // Invalid token format — nothing to revoke.
        }
    }
}
