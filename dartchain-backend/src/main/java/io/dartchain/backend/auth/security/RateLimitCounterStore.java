package io.dartchain.backend.auth.security;

public interface RateLimitCounterStore {

    int incrementAndGet(String bucketKey, long windowMs);
}
