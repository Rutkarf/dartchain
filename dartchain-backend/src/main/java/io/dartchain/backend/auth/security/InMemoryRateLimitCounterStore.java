package io.dartchain.backend.auth.security;

import org.springframework.boot.autoconfigure.condition.ConditionalOnProperty;
import org.springframework.stereotype.Component;

import java.util.Map;
import java.util.concurrent.ConcurrentHashMap;

@Component
@ConditionalOnProperty(name = "dartchain.persistence.mode", havingValue = "memory", matchIfMissing = true)
public class InMemoryRateLimitCounterStore implements RateLimitCounterStore {

    private final Map<String, WindowCounter> counters = new ConcurrentHashMap<>();

    @Override
    public int incrementAndGet(String bucketKey, long windowMs) {
        WindowCounter counter = counters.compute(bucketKey, (key, existing) -> {
            long now = System.currentTimeMillis();
            if (existing == null || now - existing.windowStartMs >= windowMs) {
                return new WindowCounter(now, 1);
            }
            existing.count += 1;
            return existing;
        });
        return counter.count;
    }

    private static final class WindowCounter {
        private final long windowStartMs;
        private int count;

        private WindowCounter(long windowStartMs, int count) {
            this.windowStartMs = windowStartMs;
            this.count = count;
        }
    }
}
