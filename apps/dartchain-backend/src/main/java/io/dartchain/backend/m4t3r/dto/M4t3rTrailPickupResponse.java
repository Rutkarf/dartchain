package io.dartchain.backend.m4t3r.dto;

import java.util.List;

public record M4t3rTrailPickupResponse(
        String type,
        String playerId,
        List<String> collectedCells,
        int amount,
        int totalBalance,
        long respawnAt
) {
}
