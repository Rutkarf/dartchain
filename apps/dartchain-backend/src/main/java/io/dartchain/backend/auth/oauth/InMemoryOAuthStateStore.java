package io.dartchain.backend.auth.oauth;

import org.springframework.stereotype.Component;

import java.time.Instant;
import java.util.Map;
import java.util.Optional;
import java.util.UUID;
import java.util.concurrent.ConcurrentHashMap;

@Component
public class InMemoryOAuthStateStore {

    private static final long TTL_SECONDS = 600;

    public record OAuthStateSnapshot(String redirectUri, String codeVerifier) {
    }

    private record Entry(String redirectUri, String codeVerifier, Instant expiresAt) {
        boolean expired() {
            return Instant.now().isAfter(expiresAt);
        }
    }

    private final Map<String, Entry> states = new ConcurrentHashMap<>();

    public String createState(String redirectUri) {
        return createState(redirectUri, null);
    }

    public String createState(String redirectUri, String codeVerifier) {
        cleanupExpired();
        String state = UUID.randomUUID().toString();
        states.put(state, new Entry(redirectUri, codeVerifier, Instant.now().plusSeconds(TTL_SECONDS)));
        return state;
    }

    public Optional<String> consumeRedirectUri(String state) {
        return consumeState(state).map(OAuthStateSnapshot::redirectUri);
    }

    public Optional<OAuthStateSnapshot> consumeState(String state) {
        if (state == null || state.isBlank()) {
            return Optional.empty();
        }

        Entry entry = states.remove(state);
        if (entry == null || entry.expired()) {
            return Optional.empty();
        }

        return Optional.of(new OAuthStateSnapshot(entry.redirectUri(), entry.codeVerifier()));
    }

    private void cleanupExpired() {
        states.entrySet().removeIf(entry -> entry.getValue().expired());
    }
}
