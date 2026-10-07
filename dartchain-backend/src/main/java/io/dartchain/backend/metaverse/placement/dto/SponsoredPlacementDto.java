package io.dartchain.backend.metaverse.placement.dto;

import com.fasterxml.jackson.annotation.JsonInclude;

@JsonInclude(JsonInclude.Include.NON_NULL)
public record SponsoredPlacementDto(
        String id,
        String buildingId,
        String placementType,
        PlacementWorldDto anchorWorld,
        PlacementGeoDto anchorGeo,
        FacingDto facing,
        String visibilityTier,
        String status,
        String merchantId,
        String campaignId,
        DisplayPolicyDto displayPolicy
) {
    public record FacingDto(double facingRad) {
    }

    @JsonInclude(JsonInclude.Include.NON_NULL)
    public record DisplayPolicyDto(boolean showWhenUnselected, Double maxDistanceMeters) {
    }
}
