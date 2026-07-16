package io.dartchain.backend.auth.security;

import io.dartchain.backend.auth.security.InMemoryRateLimitCounterStore;
import io.dartchain.backend.config.RateLimitProperties;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;

import static org.assertj.core.api.Assertions.assertThat;

class RateLimitFilterTest {

    private RateLimitFilter rateLimitFilter;

    @BeforeEach
    void setUp() {
        rateLimitFilter = new RateLimitFilter(new RateLimitProperties(), new InMemoryRateLimitCounterStore());
    }

    @Test
    void limitsConfiguredPaths() {
        assertThat(rateLimitFilter.isLimitedPath("/api/exchange-panel/swap")).isTrue();
        assertThat(rateLimitFilter.isLimitedPath("/api/blockchain/mine")).isTrue();
        assertThat(rateLimitFilter.isLimitedPath("/api/showcase/chat/messages")).isTrue();
        assertThat(rateLimitFilter.isLimitedPath("/api/pending-transactions")).isTrue();
    }

    @Test
    void limitsPendingMinePattern() {
        assertThat(rateLimitFilter.isLimitedPath("/api/pending-transactions/abc-123/mine")).isTrue();
    }

    @Test
    void doesNotLimitPublicReadEndpoints() {
        assertThat(rateLimitFilter.isLimitedPath("/api/health")).isFalse();
        assertThat(rateLimitFilter.isLimitedPath("/api/blockchain/stats")).isFalse();
        assertThat(rateLimitFilter.isLimitedPath("/api/showcase/news")).isFalse();
    }
}
