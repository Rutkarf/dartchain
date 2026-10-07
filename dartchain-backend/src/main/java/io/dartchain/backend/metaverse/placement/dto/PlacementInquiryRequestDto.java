package io.dartchain.backend.metaverse.placement.dto;

import com.fasterxml.jackson.annotation.JsonIgnoreProperties;

@JsonIgnoreProperties(ignoreUnknown = true)
public record PlacementInquiryRequestDto(
        String placementId,
        String message,
        String contactEmail,
        String locale,
        String userId
) {
}
