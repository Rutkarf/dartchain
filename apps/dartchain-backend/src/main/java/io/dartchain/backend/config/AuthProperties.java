package io.dartchain.backend.config;

import org.springframework.boot.context.properties.ConfigurationProperties;

@ConfigurationProperties(prefix = "dartchain.auth")
public class AuthProperties {

    private String jwtSecret = "dev-only-change-in-prod";
    private long accessTokenTtlSeconds = 3600;
    private long refreshTokenTtlSeconds = 604800;
    private boolean legacySessionEnabled = true;
    private String bootstrapAdminUsername = "";
    private int passwordMinLength = 8;

    public String getJwtSecret() {
        return jwtSecret;
    }

    public void setJwtSecret(String jwtSecret) {
        this.jwtSecret = jwtSecret;
    }

    public long getAccessTokenTtlSeconds() {
        return accessTokenTtlSeconds;
    }

    public void setAccessTokenTtlSeconds(long accessTokenTtlSeconds) {
        this.accessTokenTtlSeconds = accessTokenTtlSeconds;
    }

    public long getRefreshTokenTtlSeconds() {
        return refreshTokenTtlSeconds;
    }

    public void setRefreshTokenTtlSeconds(long refreshTokenTtlSeconds) {
        this.refreshTokenTtlSeconds = refreshTokenTtlSeconds;
    }

    public boolean isLegacySessionEnabled() {
        return legacySessionEnabled;
    }

    public void setLegacySessionEnabled(boolean legacySessionEnabled) {
        this.legacySessionEnabled = legacySessionEnabled;
    }

    public String getBootstrapAdminUsername() {
        return bootstrapAdminUsername;
    }

    public void setBootstrapAdminUsername(String bootstrapAdminUsername) {
        this.bootstrapAdminUsername = bootstrapAdminUsername;
    }

    public int getPasswordMinLength() {
        return passwordMinLength;
    }

    public void setPasswordMinLength(int passwordMinLength) {
        this.passwordMinLength = passwordMinLength;
    }
}
