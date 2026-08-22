package io.dartchain.backend.metaverse.placement.dto;

import com.fasterxml.jackson.annotation.JsonInclude;

@JsonInclude(JsonInclude.Include.NON_NULL)
public record PlacementCampaignDto(
        String id,
        String placementId,
        String merchantId,
        String title,
        CreativeDto creative,
        CtaDto cta,
        String startAt,
        String endAt,
        String status
) {
    @JsonInclude(JsonInclude.Include.NON_NULL)
    public record CreativeDto(String headline, String body) {
    }

    public record CtaDto(String kind, String label) {
    }
}
