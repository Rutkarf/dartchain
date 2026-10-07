package io.dartchain.backend.admin.config;

import org.springframework.boot.context.properties.ConfigurationProperties;

/**
 * Seed d’unlock panel admin global — uniquement le SHA-256 est stocké (jamais la phrase).
 */
@ConfigurationProperties(prefix = "dartchain.admin")
public class AdminSeedProperties {

    /** SHA-256 hex de la seed 24 mots (normalisée: trim + lower + espaces simples). */
    private String seedSha256 = "";

    /** TTL des tokens d’unlock (secondes). */
    private long unlockTtlSeconds = 3600;

    public String getSeedSha256() {
        return seedSha256;
    }

    public void setSeedSha256(String seedSha256) {
        this.seedSha256 = seedSha256 == null ? "" : seedSha256.trim().toLowerCase();
    }

    public long getUnlockTtlSeconds() {
        return unlockTtlSeconds;
    }

    public void setUnlockTtlSeconds(long unlockTtlSeconds) {
        this.unlockTtlSeconds = Math.max(60, unlockTtlSeconds);
    }
}
