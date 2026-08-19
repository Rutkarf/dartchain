package io.dartchain.backend.m4t3r.dto;

import java.util.List;

public record M4t3rTrailPickupResponse(
        String type,
        String playerId,
        List<String> collectedCells,
        int amount,
        long respawnAt,
        String balanceAfter,
        String playerSpeed,
        String maxAllowedSpeed,
        String settlementMode,
        List<M4t3rRewardDto> rewards
) {
    public static M4t3rTrailPickupResponse empty(String playerId) {
        return new M4t3rTrailPickupResponse(
                "M4T3R_TRAIL_PICKUP_ACCEPTED",
                playerId,
                List.of(),
                0,
                System.currentTimeMillis(),
                "0",
                "0",
                "0",
                "OFFCHAIN",
                List.of()
        );
    }
}
