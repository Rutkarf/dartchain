package io.dartchain.backend.metaverse.placement.dto;

import com.fasterxml.jackson.annotation.JsonInclude;

@JsonInclude(JsonInclude.Include.NON_NULL)
public record PlacementOfferDto(
        String id,
        String placementId,
        String commercialModel,
        AvailabilityDto availability
) {
    @JsonInclude(JsonInclude.Include.NON_NULL)
    public record AvailabilityDto(String startAt, String endAt, Integer remainingSlots) {
        public static AvailabilityDto empty() {
            return new AvailabilityDto(null, null, null);
        }
    }
}
