package io.dartchain.backend.peer;

import org.springframework.stereotype.Component;
import org.springframework.util.StringUtils;
import org.springframework.web.socket.WebSocketSession;

import java.time.Instant;
import java.util.Arrays;
import java.util.Collections;
import java.util.List;
import java.util.Map;
import java.util.concurrent.ConcurrentHashMap;

@Component
public class PeerMetricsRegistry {

    private static final int ACTIVITY_BUCKET_COUNT = 8;
    private static final int ACTIVITY_MIN = 8;
    private static final int ACTIVITY_MAX = 36;

    private final Map<String, PeerMetricsState> metricsByPeer = new ConcurrentHashMap<>();
    private final Map<String, String> sessionToPeerKey = new ConcurrentHashMap<>();

    public void bindSession(WebSocketSession session, String peerKey) {
        if (session == null || !StringUtils.hasText(peerKey)) {
            return;
        }

        String normalized = peerKey.trim();
        sessionToPeerKey.put(session.getId(), normalized);
        metricsByPeer.computeIfAbsent(normalized, ignored -> new PeerMetricsState());
    }

    public void unbindSession(WebSocketSession session) {
        if (session == null) {
            return;
        }

        sessionToPeerKey.remove(session.getId());
    }

    public String resolvePeerKey(WebSocketSession session) {
        if (session == null) {
            return "";
        }

        String bound = sessionToPeerKey.get(session.getId());
        if (StringUtils.hasText(bound)) {
            return bound;
        }

        return resolveSessionKey(session);
    }

    public void recordOutboundConnectStarted(String peerUrl) {
        if (!StringUtils.hasText(peerUrl)) {
            return;
        }

        metricsByPeer.computeIfAbsent(peerUrl.trim(), ignored -> new PeerMetricsState())
                .markConnectStarted();
    }

    public void recordOutboundConnected(String peerUrl) {
        if (!StringUtils.hasText(peerUrl)) {
            return;
        }

        PeerMetricsState state = metricsByPeer.computeIfAbsent(peerUrl.trim(), ignored -> new PeerMetricsState());
        state.markConnected();
        state.bumpActivity();
    }

    public void recordInboundConnected(WebSocketSession session) {
        String key = resolvePeerKey(session);
        if (!StringUtils.hasText(key)) {
            return;
        }

        metricsByPeer.computeIfAbsent(key, ignored -> new PeerMetricsState()).bumpActivity();
    }

    public void recordActivity(WebSocketSession session) {
        String key = resolvePeerKey(session);
        if (!StringUtils.hasText(key)) {
            return;
        }

        metricsByPeer.computeIfAbsent(key, ignored -> new PeerMetricsState()).bumpActivity();
    }

    public void recordActivity(String peerUrl) {
        if (!StringUtils.hasText(peerUrl)) {
            return;
        }

        metricsByPeer.computeIfAbsent(peerUrl.trim(), ignored -> new PeerMetricsState()).bumpActivity();
    }

    public void recordChainSync(String peerKey, int remoteHeight, int localHeight) {
        if (!StringUtils.hasText(peerKey)) {
            return;
        }

        PeerMetricsState state = metricsByPeer.computeIfAbsent(peerKey.trim(), ignored -> new PeerMetricsState());
        state.remoteChainHeight = remoteHeight;
        state.localChainHeight = localHeight;
        state.lastSyncAt = Instant.now();
        state.bumpActivity();
    }

    public PeerMetricsSnapshot getSnapshot(String peerUrl) {
        if (!StringUtils.hasText(peerUrl)) {
            return PeerMetricsSnapshot.empty();
        }

        PeerMetricsState state = metricsByPeer.get(peerUrl.trim());
        if (state == null) {
            return PeerMetricsSnapshot.empty();
        }

        return state.toSnapshot();
    }

    public Integer resolveSyncPercent(String peerUrl, PeerStatus status) {
        PeerMetricsSnapshot snapshot = getSnapshot(peerUrl);
        if (snapshot.syncPercent() != null) {
            return snapshot.syncPercent();
        }

        return fallbackSyncPercent(status);
    }

    public static Integer fallbackSyncPercent(PeerStatus status) {
        if (status == null) {
            return null;
        }

        return switch (status) {
            case CONNECTED -> 100;
            case CONNECTING -> 88;
            case DISCONNECTED -> 72;
            case ERROR -> 65;
        };
    }

    private String resolveSessionKey(WebSocketSession session) {
        if (session.getRemoteAddress() != null) {
            return session.getRemoteAddress().toString();
        }

        return session.getId();
    }

    private static final class PeerMetricsState {

        private Long latencyMs;
        private long connectStartedAtNanos;
        private Integer remoteChainHeight;
        private Integer localChainHeight;
        private Instant lastSyncAt;
        private final int[] activityBuckets = new int[ACTIVITY_BUCKET_COUNT];
        private int activityBucketIndex;

        void markConnectStarted() {
            connectStartedAtNanos = System.nanoTime();
        }

        void markConnected() {
            if (connectStartedAtNanos > 0) {
                long latencyNs = System.nanoTime() - connectStartedAtNanos;
                latencyMs = Math.max(1L, latencyNs / 1_000_000L);
                connectStartedAtNanos = 0;
            }
        }

        void bumpActivity() {
            activityBuckets[activityBucketIndex % ACTIVITY_BUCKET_COUNT]++;
            activityBucketIndex++;
        }

        PeerMetricsSnapshot toSnapshot() {
            return new PeerMetricsSnapshot(
                    latencyMs,
                    remoteChainHeight,
                    localChainHeight,
                    computeSyncPercent(),
                    lastSyncAt != null ? lastSyncAt.toString() : null,
                    normalizeActivity()
            );
        }

        private Integer computeSyncPercent() {
            if (remoteChainHeight == null || localChainHeight == null) {
                return null;
            }

            if (remoteChainHeight <= 0) {
                return 100;
            }

            if (localChainHeight >= remoteChainHeight) {
                return 100;
            }

            int percent = (int) Math.round((localChainHeight * 100.0) / remoteChainHeight);
            return Math.max(0, Math.min(100, percent));
        }

        private List<Integer> normalizeActivity() {
            int max = Arrays.stream(activityBuckets).max().orElse(0);
            if (max == 0) {
                return Collections.emptyList();
            }

            return Arrays.stream(activityBuckets)
                    .mapToObj(count -> {
                        if (count == 0) {
                            return ACTIVITY_MIN;
                        }

                        int scaled = ACTIVITY_MIN + (count * (ACTIVITY_MAX - ACTIVITY_MIN)) / max;
                        return Math.min(ACTIVITY_MAX, scaled);
                    })
                    .toList();
        }
    }

    public record PeerMetricsSnapshot(
            Long latencyMs,
            Integer chainHeight,
            Integer localChainHeight,
            Integer syncPercent,
            String lastSyncAt,
            List<Integer> activityPoints
    ) {
        public static PeerMetricsSnapshot empty() {
            return new PeerMetricsSnapshot(null, null, null, null, null, List.of());
        }
    }
}
