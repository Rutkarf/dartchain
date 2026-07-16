package io.dartchain.backend.peer;

import org.junit.jupiter.api.Test;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertFalse;
import static org.junit.jupiter.api.Assertions.assertNotNull;

class PeerMetricsRegistryTest {

    private final PeerMetricsRegistry registry = new PeerMetricsRegistry();

    @Test
    void outboundConnect_recordsLatency() {
        registry.recordOutboundConnectStarted("ws://127.0.0.1:8080/ws/peers");
        registry.recordOutboundConnected("ws://127.0.0.1:8080/ws/peers");

        PeerMetricsRegistry.PeerMetricsSnapshot snapshot =
                registry.getSnapshot("ws://127.0.0.1:8080/ws/peers");

        assertNotNull(snapshot.latencyMs());
        assertFalse(snapshot.activityPoints().isEmpty());
    }

    @Test
    void chainSync_computesSyncPercentWhenBehind() {
        registry.recordChainSync("peer-a", 10, 5);

        PeerMetricsRegistry.PeerMetricsSnapshot snapshot = registry.getSnapshot("peer-a");

        assertEquals(10, snapshot.chainHeight());
        assertEquals(5, snapshot.localChainHeight());
        assertEquals(50, snapshot.syncPercent());
        assertNotNull(snapshot.lastSyncAt());
    }

    @Test
    void chainSync_returnsOneHundredWhenCaughtUp() {
        registry.recordChainSync("peer-b", 4, 4);

        assertEquals(100, registry.getSnapshot("peer-b").syncPercent());
    }

    @Test
    void fallbackSyncPercent_matchesLegacyUiDefaults() {
        assertEquals(100, PeerMetricsRegistry.fallbackSyncPercent(PeerStatus.CONNECTED));
        assertEquals(88, PeerMetricsRegistry.fallbackSyncPercent(PeerStatus.CONNECTING));
        assertEquals(72, PeerMetricsRegistry.fallbackSyncPercent(PeerStatus.DISCONNECTED));
        assertEquals(65, PeerMetricsRegistry.fallbackSyncPercent(PeerStatus.ERROR));
    }
}
