package io.dartchain.backend.metaverse.placement.dto;

import java.util.List;

public record MetaversePlacementsResponse(
        String type,
        String source,
        String serverTime,
        List<PlacementBuildingDto> buildings,
        List<SponsoredPlacementDto> placements,
        List<MerchantProfileDto> merchants,
        List<PlacementCampaignDto> campaigns,
        List<PlacementOfferDto> offers
) {
    public static final String TYPE = "METAVERSE_PLACEMENTS";
    public static final String SOURCE = "authorized-api";
}
