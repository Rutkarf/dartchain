package io.dartchain.backend.ops;

import org.springframework.stereotype.Component;

import java.time.Instant;
import java.util.ArrayList;
import java.util.Deque;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;
import java.util.concurrent.ConcurrentLinkedDeque;
import java.util.concurrent.atomic.AtomicLong;

/**
 * Compteurs métier in-memory — Phase X, enrichi Phase AE (sans Prometheus/Grafana).
 */
@Component
public class ApplicationMetricsCollector {

    static final int MAX_RECENT_EVENTS = 50;

    private final AtomicLong blocksMined = new AtomicLong();
    private final AtomicLong swapsCompleted = new AtomicLong();
    private final AtomicLong authRegistrations = new AtomicLong();
    private final AtomicLong authLogins = new AtomicLong();
    private final AtomicLong authRefreshes = new AtomicLong();
    private final AtomicLong authLogouts = new AtomicLong();
    private final AtomicLong mutationsAuthorized = new AtomicLong();
    private final AtomicLong rbacDenied = new AtomicLong();
    private final AtomicLong rateLimitHits = new AtomicLong();
    private final AtomicLong faucetClaims = new AtomicLong();
    private final AtomicLong peersRegistered = new AtomicLong();
    private final AtomicLong httpErrors = new AtomicLong();

    private final AtomicLong requestCount = new AtomicLong();
    private final AtomicLong requestLatencyTotalMs = new AtomicLong();
    private final AtomicLong requestLatencyMaxMs = new AtomicLong();

    private final Deque<OpsEventEntry> recentEvents = new ConcurrentLinkedDeque<>();

    public void recordBlockMined(String detail) {
        blocksMined.incrementAndGet();
        pushEvent("block.mined", detail);
    }

    public void recordSwap(String detail) {
        swapsCompleted.incrementAndGet();
        pushEvent("swap.completed", detail);
    }

    public void recordAuthRegistration(String username) {
        authRegistrations.incrementAndGet();
        pushEvent("auth.register", username);
    }

    public void recordAuthLogin(String identifier) {
        authLogins.incrementAndGet();
        pushEvent("auth.login", identifier);
    }

    public void recordAuthRefresh(String userId) {
        authRefreshes.incrementAndGet();
        pushEvent("auth.refresh", userId);
    }

    public void recordAuthLogout(String userId) {
        authLogouts.incrementAndGet();
        pushEvent("auth.logout", userId);
    }

    public void recordMutation(String action, String detail) {
        mutationsAuthorized.incrementAndGet();
        pushEvent("mutation." + action, detail);
    }

    public void recordRbacDenied(String action, String detail) {
        rbacDenied.incrementAndGet();
        pushEvent("rbac.denied", action + " " + detail);
    }

    public void recordRateLimitHit(String clientKey) {
        rateLimitHits.incrementAndGet();
        pushEvent("rate.limit", clientKey);
    }

    public void recordFaucetClaim(String walletAddress) {
        faucetClaims.incrementAndGet();
        pushEvent("faucet.claim", walletAddress);
    }

    public void recordPeerRegistered(String peerUrl) {
        peersRegistered.incrementAndGet();
        pushEvent("peer.registered", peerUrl);
    }

    public void recordHttpError(int status, String message) {
        httpErrors.incrementAndGet();
        pushEvent("http.error", status + " " + message);
    }

    public void recordRequest(long durationMs, int statusCode) {
        requestCount.incrementAndGet();
        requestLatencyTotalMs.addAndGet(Math.max(durationMs, 0L));
        requestLatencyMaxMs.updateAndGet(current -> Math.max(current, durationMs));
    }

    public Map<String, Long> countersSnapshot() {
        Map<String, Long> counters = new LinkedHashMap<>();
        counters.put("blocksMined", blocksMined.get());
        counters.put("swapsCompleted", swapsCompleted.get());
        counters.put("authRegistrations", authRegistrations.get());
        counters.put("authLogins", authLogins.get());
        counters.put("authRefreshes", authRefreshes.get());
        counters.put("authLogouts", authLogouts.get());
        counters.put("mutationsAuthorized", mutationsAuthorized.get());
        counters.put("rbacDenied", rbacDenied.get());
        counters.put("rateLimitHits", rateLimitHits.get());
        counters.put("faucetClaims", faucetClaims.get());
        counters.put("peersRegistered", peersRegistered.get());
        counters.put("httpErrors", httpErrors.get());
        return Map.copyOf(counters);
    }

    public Map<String, Long> latencySnapshot() {
        long count = requestCount.get();
        long totalMs = requestLatencyTotalMs.get();
        long avgMs = count == 0 ? 0 : totalMs / count;

        Map<String, Long> latency = new LinkedHashMap<>();
        latency.put("requestCount", count);
        latency.put("avgRequestLatencyMs", avgMs);
        latency.put("maxRequestLatencyMs", requestLatencyMaxMs.get());
        return Map.copyOf(latency);
    }

    public List<OpsEventEntry> recentEventsSnapshot() {
        return List.copyOf(new ArrayList<>(recentEvents));
    }

    private void pushEvent(String type, String detail) {
        recentEvents.addFirst(new OpsEventEntry(Instant.now(), type, detail));
        while (recentEvents.size() > MAX_RECENT_EVENTS) {
            recentEvents.removeLast();
        }
    }

    public record OpsEventEntry(Instant at, String type, String detail) {
    }
}
