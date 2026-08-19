package io.dartchain.backend.metaverse.wigle.dto;

import java.util.List;

public record WiglePointsResponse(
        String type,
        String source,
        double centerLatitude,
        double centerLongitude,
        double radiusMeters,
        List<WiglePointDto> points
) {
}
