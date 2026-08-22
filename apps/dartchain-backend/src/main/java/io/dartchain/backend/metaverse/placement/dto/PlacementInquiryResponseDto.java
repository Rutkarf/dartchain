package io.dartchain.backend.metaverse.placement.dto;

import com.fasterxml.jackson.annotation.JsonInclude;

@JsonInclude(JsonInclude.Include.NON_NULL)
public record PlacementInquiryResponseDto(
        String inquiryId,
        String status,
        String message
) {
    public static final String RECEIVED = "received";
    public static final String REJECTED = "rejected";
}
