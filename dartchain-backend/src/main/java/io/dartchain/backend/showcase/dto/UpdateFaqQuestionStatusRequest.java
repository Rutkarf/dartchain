package io.dartchain.backend.showcase.dto;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Pattern;

public record UpdateFaqQuestionStatusRequest(
        @NotBlank
        @Pattern(regexp = "ACTIVE|PINNED|ARCHIVED", flags = Pattern.Flag.CASE_INSENSITIVE)
        String status
) {}
