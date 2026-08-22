package io.dartchain.backend.metaverse.placement.dto;

import com.fasterxml.jackson.annotation.JsonInclude;

@JsonInclude(JsonInclude.Include.NON_NULL)
public record PlacementBuildingDto(
        String id,
        String label,
        PlacementGeoDto geo,
        PlacementWorldDto world,
        String visualVariant,
        String status
) {
}
