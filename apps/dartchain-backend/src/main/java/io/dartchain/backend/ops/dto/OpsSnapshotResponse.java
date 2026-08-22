package io.dartchain.backend.ops.dto;

import java.time.Instant;
import java.util.List;
import java.util.Map;

public class OpsSnapshotResponse {

    private final Instant collectedAt;
    private final Map<String, Long> counters;
    private final Map<String, Long> gauges;
    private final Map<String, Long> latency;
    private final Map<String, Object> metadata;
    private final List<OpsEventView> recentEvents;
    private final List<OpsAlertResponse> alerts;
    private final String phase;

    public OpsSnapshotResponse(
            Instant collectedAt,
            Map<String, Long> counters,
            Map<String, Long> gauges,
            List<OpsEventView> recentEvents,
            List<OpsAlertResponse> alerts,
            String phase
    ) {
        this(collectedAt, counters, gauges, Map.of(), Map.of(), recentEvents, alerts, phase);
    }

    public OpsSnapshotResponse(
            Instant collectedAt,
            Map<String, Long> counters,
            Map<String, Long> gauges,
            Map<String, Long> latency,
            Map<String, Object> metadata,
            List<OpsEventView> recentEvents,
            List<OpsAlertResponse> alerts,
            String phase
    ) {
        this.collectedAt = collectedAt;
        this.counters = counters;
        this.gauges = gauges;
        this.latency = latency;
        this.metadata = metadata;
        this.recentEvents = recentEvents;
        this.alerts = alerts;
        this.phase = phase;
    }

    public Instant getCollectedAt() {
        return collectedAt;
    }

    public Map<String, Long> getCounters() {
        return counters;
    }

    public Map<String, Long> getGauges() {
        return gauges;
    }

    public Map<String, Long> getLatency() {
        return latency;
    }

    public Map<String, Object> getMetadata() {
        return metadata;
    }

    public List<OpsEventView> getRecentEvents() {
        return recentEvents;
    }

    public List<OpsAlertResponse> getAlerts() {
        return alerts;
    }

    public String getPhase() {
        return phase;
    }

    public record OpsEventView(Instant at, String type, String detail) {
    }
}
