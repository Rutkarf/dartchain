package io.dartchain.backend.showcase.dto;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Pattern;

public record FaqVoteRequest(
        @NotBlank
        @Pattern(regexp = "UP|DOWN", flags = Pattern.Flag.CASE_INSENSITIVE)
        String direction
) {}
