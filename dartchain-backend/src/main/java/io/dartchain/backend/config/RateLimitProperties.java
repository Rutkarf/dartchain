package io.dartchain.backend.config;

import org.springframework.boot.context.properties.ConfigurationProperties;

import java.util.ArrayList;
import java.util.List;

@ConfigurationProperties(prefix = "dartchain.rate-limit")
public class RateLimitProperties {

    private int maxRequests = 60;
    private long windowMs = 60_000L;
    private List<String> paths = defaultPaths();

    public int getMaxRequests() {
        return maxRequests;
    }

    public void setMaxRequests(int maxRequests) {
        this.maxRequests = maxRequests;
    }

    public long getWindowMs() {
        return windowMs;
    }

    public void setWindowMs(long windowMs) {
        this.windowMs = windowMs;
    }

    public List<String> getPaths() {
        return paths;
    }

    public void setPaths(List<String> paths) {
        this.paths = paths == null ? defaultPaths() : new ArrayList<>(paths);
    }

    public static List<String> defaultPaths() {
        return List.of(
                "/api/auth/register",
                "/api/auth/login",
                "/api/v1/auth/register",
                "/api/v1/auth/login",
                "/api/v1/auth/refresh",
                "/api/v1/auth/email/confirm",
                "/api/v1/auth/email/resend",
                "/api/v1/auth/2fa/verify",
                "/api/wallets/create-client",
                "/api/wallets/verify",
                "/api/faucet/claim",
                "/api/exchange-panel/swap",
                "/api/blockchain/mine",
                "/api/peers",
                "/api/peers/reconnect",
                "/api/peers/disconnect",
                "/api/transactions",
                "/api/showcase/chat/messages",
                "/api/showcase/launch/projects"
        );
    }
}
