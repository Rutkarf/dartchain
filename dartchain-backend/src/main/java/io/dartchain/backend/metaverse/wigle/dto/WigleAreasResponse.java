package io.dartchain.backend.metaverse.wigle.dto;

import java.util.List;

public record WigleAreasResponse(
        String type,
        String source,
        List<WigleAreaAggregateDto> areas
) {
}
