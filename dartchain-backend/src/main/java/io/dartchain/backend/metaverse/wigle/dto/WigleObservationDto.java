package io.dartchain.backend.metaverse.wigle.dto;

public record WigleObservationDto(
        String id,
        String anonymizedId,
        double latitudeApprox,
        double longitudeApprox,
        Double altitudeApprox,
        Integer signalLevel,
        Integer channel,
        Double frequency,
        String networkType,
        String observedAt,
        String confidence,
        String source
) {
}
