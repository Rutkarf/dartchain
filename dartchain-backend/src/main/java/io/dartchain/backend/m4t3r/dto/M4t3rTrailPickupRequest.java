package io.dartchain.backend.m4t3r.dto;

import java.util.List;

public record M4t3rTrailPickupRequest(
        String type,
        String playerId,
        WorldPoint previousPosition,
        WorldPoint currentPosition,
        List<String> candidateCellIds,
        long timestamp,
        String clientSpeedEstimate,
        String nonce
) {
    public M4t3rTrailPickupRequest(
            String type,
            String playerId,
            WorldPoint previousPosition,
            WorldPoint currentPosition,
            List<String> candidateCellIds,
            long timestamp
    ) {
        this(type, playerId, previousPosition, currentPosition, candidateCellIds, timestamp, null, null);
    }
}
