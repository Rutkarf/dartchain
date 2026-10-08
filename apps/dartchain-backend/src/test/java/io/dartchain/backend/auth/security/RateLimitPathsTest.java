package io.dartchain.backend.auth.security;

import io.dartchain.backend.config.RateLimitProperties;
import org.junit.jupiter.api.Test;

import static org.assertj.core.api.Assertions.assertThat;

class RateLimitPathsTest {

    @Test
    void defaultCeilingMatchesYaml() {
        assertThat(new RateLimitProperties().getMaxRequests()).isEqualTo(60);
    }

    @Test
    void coversVersionedAuthAndAddressedMine() {
        RateLimitProperties properties = new RateLimitProperties();
        RateLimitFilter filter = new RateLimitFilter(properties, (key, windowMs) -> 1);

        assertThat(properties.getPaths()).contains(
                "/api/v1/auth/register",
                "/api/v1/auth/login",
                "/api/v1/auth/refresh"
        );
        assertThat(properties.getPaths()).doesNotContain("/api/wallets/create");
        assertThat(filter.isLimitedPath("/api/v1/auth/login")).isTrue();
        assertThat(filter.isLimitedPath("/api/blockchain/mine/abc")).isTrue();
        assertThat(filter.isLimitedPath("/api/blockchain/mine")).isTrue();
    }
}
