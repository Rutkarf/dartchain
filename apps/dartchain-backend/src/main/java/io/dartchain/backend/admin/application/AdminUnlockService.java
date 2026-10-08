package io.dartchain.backend.admin.application;

import io.dartchain.backend.admin.config.AdminSeedProperties;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.web.server.ResponseStatusException;

import java.nio.charset.StandardCharsets;
import java.security.MessageDigest;
import java.security.NoSuchAlgorithmException;
import java.util.HexFormat;
import java.util.Map;
import java.util.UUID;
import java.util.concurrent.ConcurrentHashMap;

@Service
public class AdminUnlockService {

    public static final String UNLOCK_HEADER = "X-Admin-Unlock-Token";

    private final AdminSeedProperties properties;
    private final Map<String, Long> tokens = new ConcurrentHashMap<>();

    public AdminUnlockService(AdminSeedProperties properties) {
        this.properties = properties;
    }

    public UnlockResult unlock(String seedPhrase) {
        if (!isConfigured()) {
            throw new ResponseStatusException(
                    HttpStatus.SERVICE_UNAVAILABLE,
                    "Admin seed non configurée (DARTCHAIN_ADMIN_SEED_SHA256)"
            );
        }
        String normalized = normalizeSeed(seedPhrase);
        if (normalized.isBlank()) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Seed requise");
        }
        String digest = sha256Hex(normalized);
        if (!MessageDigest.isEqual(
                digest.getBytes(StandardCharsets.UTF_8),
                properties.getSeedSha256().getBytes(StandardCharsets.UTF_8)
        )) {
            throw new ResponseStatusException(HttpStatus.UNAUTHORIZED, "Graine d’administration invalide");
        }
        purgeExpired();
        String token = UUID.randomUUID().toString();
        long expiresAt = System.currentTimeMillis() + properties.getUnlockTtlSeconds() * 1000L;
        tokens.put(token, expiresAt);
        return new UnlockResult(token, expiresAt, properties.getUnlockTtlSeconds());
    }

    public void requireUnlock(String unlockToken) {
        if (!isConfigured()) {
            throw new ResponseStatusException(
                    HttpStatus.SERVICE_UNAVAILABLE,
                    "Admin seed non configurée"
            );
        }
        if (unlockToken == null || unlockToken.isBlank()) {
            throw new ResponseStatusException(HttpStatus.UNAUTHORIZED, "Token unlock admin requis");
        }
        Long expiresAt = tokens.get(unlockToken.trim());
        if (expiresAt == null || expiresAt < System.currentTimeMillis()) {
            tokens.remove(unlockToken.trim());
            throw new ResponseStatusException(HttpStatus.UNAUTHORIZED, "Session admin expirée — resaisir la seed");
        }
    }

    public void lock(String unlockToken) {
        if (unlockToken != null) {
            tokens.remove(unlockToken.trim());
        }
    }

    public boolean isConfigured() {
        String seed = properties.getSeedSha256();
        return seed != null && seed.matches("^[0-9a-fA-F]{64}$");
    }

    public static String normalizeSeed(String seed) {
        if (seed == null) {
            return "";
        }
        return seed.trim().toLowerCase().replaceAll("\\s+", " ");
    }

    public static String sha256Hex(String value) {
        try {
            MessageDigest digest = MessageDigest.getInstance("SHA-256");
            byte[] hash = digest.digest(value.getBytes(StandardCharsets.UTF_8));
            return HexFormat.of().formatHex(hash);
        } catch (NoSuchAlgorithmException exception) {
            throw new IllegalStateException("SHA-256 unavailable", exception);
        }
    }

    private void purgeExpired() {
        long now = System.currentTimeMillis();
        tokens.entrySet().removeIf(entry -> entry.getValue() < now);
    }

    public record UnlockResult(String unlockToken, long expiresAtEpochMs, long ttlSeconds) {
    }
}
