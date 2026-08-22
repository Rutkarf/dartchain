package io.dartchain.backend.metaverse.placement.dto;

import com.fasterxml.jackson.annotation.JsonInclude;

@JsonInclude(JsonInclude.Include.NON_NULL)
public record MerchantProfileDto(
        String id,
        String displayName,
        String category,
        String verifiedStatus,
        PublicProfileDto publicProfile
) {
    @JsonInclude(JsonInclude.Include.NON_NULL)
    public record PublicProfileDto(String shortDescription, String categoryLabel) {
    }
}
