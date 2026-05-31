package io.dartchain.backend.utils;

import java.time.Instant;

public final class FaucetTimeUtils {

    private FaucetTimeUtils() {
    }

    public static long remainingCooldownSeconds(long nowMillis, long nextEligibleAtMillis) {
        long diff = nextEligibleAtMillis - nowMillis;
        if (diff <= 0) {
            return 0;
        }
        return (long) Math.ceil(diff / 1000.0);
    }

    public static String toIso(long epochMillis) {
        return Instant.ofEpochMilli(epochMillis).toString();
    }
}