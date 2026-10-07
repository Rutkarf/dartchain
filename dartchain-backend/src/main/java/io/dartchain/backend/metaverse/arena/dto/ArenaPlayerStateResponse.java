package io.dartchain.backend.metaverse.arena.dto;

import java.math.BigDecimal;

public record ArenaPlayerStateResponse(
        String userId,
        String displayName,
        String status,
        BigDecimal faucetBalance,
        BigDecimal protectedBalance,
        BigDecimal pendingDisplayMirror,
        int kills,
        int deaths,
        String spawnShieldUntil
) {
}
