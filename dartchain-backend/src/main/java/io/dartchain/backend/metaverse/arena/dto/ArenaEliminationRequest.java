package io.dartchain.backend.metaverse.arena.dto;

import jakarta.validation.constraints.NotBlank;

public record ArenaEliminationRequest(
        @NotBlank String eventId,
        @NotBlank String killerUserId,
        @NotBlank String victimUserId
) {
}
