package io.dartchain.backend.metaverse.wigle.dto;

import java.util.Map;

public record WigleBuildingAggregateDto(
        String buildingId,
        int observationCount,
        Double signalAverage,
        Double signalMin,
        Double signalMax,
        Map<String, Integer> networkTypeCounts,
        Map<String, Integer> channelCounts,
        String lastObservedAt,
        String confidence
) {
}
