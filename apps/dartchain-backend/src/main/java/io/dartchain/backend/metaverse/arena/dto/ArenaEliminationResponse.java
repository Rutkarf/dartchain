package io.dartchain.backend.metaverse.arena.dto;

import java.math.BigDecimal;

public record ArenaEliminationResponse(
        String eventId,
        boolean accepted,
        String reason,
        String killerUserId,
        String victimUserId,
        BigDecimal lootAmount,
        BigDecimal killerFaucetBalanceAfter,
        BigDecimal victimFaucetBalanceAfter
) {
}
