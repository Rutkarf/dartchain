package io.dartchain.backend.metaverse.wigle.dto;

import java.util.List;

public record WigleBuildingsResponse(
        String type,
        String source,
        List<WigleBuildingAggregateDto> aggregates,
        int totalObservations,
        int unmatchedObservations
) {
}
