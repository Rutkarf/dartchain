package io.dartchain.backend.metaverse.placement.dto;

import com.fasterxml.jackson.annotation.JsonInclude;

@JsonInclude(JsonInclude.Include.NON_NULL)
public record MetaversePlacementDetailResponse(
        String type,
        String source,
        String serverTime,
        PlacementBuildingDto building,
        SponsoredPlacementDto placement,
        MerchantProfileDto merchant,
        PlacementCampaignDto campaign,
        PlacementOfferDto offer
) {
    public static final String TYPE = "METAVERSE_PLACEMENT_DETAIL";
}
