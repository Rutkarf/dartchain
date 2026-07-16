package io.dartchain.backend.quests.dto;

import jakarta.validation.constraints.Min;
import jakarta.validation.constraints.NotNull;

public record ExploreBlockRequest(
        @NotNull @Min(0) Integer blockIndex
) {
}
