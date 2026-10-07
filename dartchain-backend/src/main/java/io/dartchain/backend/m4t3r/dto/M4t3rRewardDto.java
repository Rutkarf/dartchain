package io.dartchain.backend.m4t3r.dto;

import java.math.BigDecimal;

public record M4t3rRewardDto(
        String rewardId,
        String collectionId,
        String tokenId,
        String amount,
        String playerSpeed,
        String maxAllowedSpeed,
        String status,
        String proofHash,
        String serverSignature,
        String transactionId,
        long collectedAt
) {
    public static M4t3rRewardDto from(
            String rewardId,
            String collectionId,
            String tokenId,
            BigDecimal amount,
            BigDecimal playerSpeed,
            BigDecimal maxAllowedSpeed,
            String status,
            String proofHash,
            String serverSignature,
            String transactionId,
            long collectedAt
    ) {
        return new M4t3rRewardDto(
                rewardId,
                collectionId,
                tokenId,
                amount.toPlainString(),
                playerSpeed.toPlainString(),
                maxAllowedSpeed.toPlainString(),
                status,
                proofHash,
                serverSignature,
                transactionId,
                collectedAt
        );
    }
}
