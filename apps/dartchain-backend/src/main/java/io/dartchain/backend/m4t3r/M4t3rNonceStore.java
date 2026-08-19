package io.dartchain.backend.m4t3r;

import org.springframework.stereotype.Component;

import java.util.Map;
import java.util.concurrent.ConcurrentHashMap;

/**
 * Journal anti-rejeu des nonces de collecte (append-only en mémoire, TTL 10 min).
 */
@Component
public class M4t3rNonceStore {

    private static final long TTL_MS = 10 * 60 * 1000L;

    private final Map<String, Long> usedNonces = new ConcurrentHashMap<>();

    /**
     * @return true si le nonce est nouveau et a été enregistré ; false s'il a déjà été utilisé.
     */
    public synchronized boolean register(String playerId, String nonce) {
        expire();
        if (nonce == null || nonce.isBlank()) {
            return true;
        }
        String key = playerId + ":" + nonce;
        if (usedNonces.containsKey(key)) {
            return false;
        }
        usedNonces.put(key, System.currentTimeMillis());
        return true;
    }

    private void expire() {
        long cutoff = System.currentTimeMillis() - TTL_MS;
        usedNonces.entrySet().removeIf(entry -> entry.getValue() < cutoff);
    }
}
