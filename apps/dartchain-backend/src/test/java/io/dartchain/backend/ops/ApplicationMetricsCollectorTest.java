package io.dartchain.backend.ops;

import org.junit.jupiter.api.Test;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertFalse;
import static org.junit.jupiter.api.Assertions.assertTrue;

class ApplicationMetricsCollectorTest {

    @Test
    void recordsCountersAndRecentEvents() {
        ApplicationMetricsCollector collector = new ApplicationMetricsCollector();

        collector.recordSwap("R4V3->BTC");
        collector.recordBlockMined("index=1");

        assertEquals(1L, collector.countersSnapshot().get("swapsCompleted"));
        assertEquals(1L, collector.countersSnapshot().get("blocksMined"));
        assertFalse(collector.recentEventsSnapshot().isEmpty());
        assertEquals("block.mined", collector.recentEventsSnapshot().getFirst().type());
    }

    @Test
    void recordsAeCountersAndLatency() {
        ApplicationMetricsCollector collector = new ApplicationMetricsCollector();

        collector.recordAuthRefresh("user-1");
        collector.recordMutation("blockchain.mine", "ok");
        collector.recordRbacDenied("requireAdmin", "alice");
        collector.recordRateLimitHit("127.0.0.1|/api/exchange-panel/swap");
        collector.recordRequest(120L, 200);
        collector.recordRequest(80L, 201);

        assertEquals(1L, collector.countersSnapshot().get("authRefreshes"));
        assertEquals(1L, collector.countersSnapshot().get("mutationsAuthorized"));
        assertEquals(1L, collector.countersSnapshot().get("rbacDenied"));
        assertEquals(1L, collector.countersSnapshot().get("rateLimitHits"));
        assertEquals(2L, collector.latencySnapshot().get("requestCount"));
        assertEquals(100L, collector.latencySnapshot().get("avgRequestLatencyMs"));
        assertEquals(120L, collector.latencySnapshot().get("maxRequestLatencyMs"));
        assertTrue(collector.recentEventsSnapshot().stream()
                .anyMatch(event -> event.type().equals("mutation.blockchain.mine")));
    }
}
