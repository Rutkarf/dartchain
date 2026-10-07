package io.dartchain.backend.peer;

import java.util.List;

public record PeerView(
        String url,
        String status,
        String message,
        Long latencyMs,
        Integer chainHeight,
        Integer localChainHeight,
        Integer syncPercent,
        String lastSyncAt,
        List<Integer> activityPoints
) {
    public PeerView(String url, String status, String message) {
        this(url, status, message, null, null, null, null, null, null);
    }
}
