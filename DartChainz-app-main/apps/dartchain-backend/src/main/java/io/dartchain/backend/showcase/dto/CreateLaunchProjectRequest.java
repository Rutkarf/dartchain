package io.dartchain.backend.showcase.dto;

import jakarta.validation.constraints.Max;
import jakarta.validation.constraints.Min;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Pattern;
import jakarta.validation.constraints.Size;

import java.math.BigDecimal;

public record CreateLaunchProjectRequest(
        @NotBlank @Size(min = 2, max = 40) String name,
        @NotBlank
        @Size(min = 2, max = 8)
        @Pattern(regexp = "^[A-Z0-9]+$", message = "Symbol must be uppercase alphanumeric")
        String symbol,
        BigDecimal targetAmount,
        @Size(max = 600) String description,
        @Size(max = 120_000) String logoUrl,
        @Size(max = 32) String chain,
        BigDecimal totalSupply,
        @Min(0) @Max(18) Integer decimals,
        @Size(max = 2048) String website,
        @Size(max = 2048) String whitepaperUrl,
        @Size(max = 120) String twitter,
        @Size(max = 120) String telegram,
        @Size(max = 120) String discord,
        BigDecimal hardCap,
        @Min(0) @Max(100) Integer liquidityPercent,
        @Size(max = 40) String launchDate,
        @Size(max = 120) String contractAddress
) {}
