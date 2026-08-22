package io.dartchain.backend.auth.oauth;

import io.dartchain.backend.auth.model.UserAccount;
import org.springframework.stereotype.Component;

import java.time.Instant;
import java.util.Map;
import java.util.Optional;
import java.util.UUID;
import java.util.concurrent.ConcurrentHashMap;

@Component
public class InMemoryOAuthExchangeCodeStore {

    private static final long TTL_SECONDS = 120;

    private record Entry(UserAccount account, Instant expiresAt) {
        boolean expired() {
            return Instant.now().isAfter(expiresAt);
        }
    }

    private final Map<String, Entry> codes = new ConcurrentHashMap<>();

    public String issue(UserAccount account) {
        cleanupExpired();
        String code = UUID.randomUUID().toString();
        codes.put(code, new Entry(account, Instant.now().plusSeconds(TTL_SECONDS)));
        return code;
    }

    public Optional<UserAccount> consume(String code) {
        if (code == null || code.isBlank()) {
            return Optional.empty();
        }

        Entry entry = codes.remove(code);
        if (entry == null || entry.expired()) {
            return Optional.empty();
        }

        return Optional.of(entry.account());
    }

    private void cleanupExpired() {
        codes.entrySet().removeIf(entry -> entry.getValue().expired());
    }
}
