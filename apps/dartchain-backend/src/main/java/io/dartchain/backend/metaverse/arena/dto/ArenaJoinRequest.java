package io.dartchain.backend.metaverse.arena.dto;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;

import java.math.BigDecimal;

public record ArenaJoinRequest(
        @NotBlank String displayName,
        @NotNull BigDecimal pendingDisplayMirror
) {
}
