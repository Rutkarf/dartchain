package io.dartchain.backend.m4t3r.settlement;

import java.math.BigDecimal;

public record SettlementResult(
        boolean success,
        String status,
        String transactionId,
        String chainId,
        BigDecimal balanceAfter,
        String failureReason
) {
    public static SettlementResult creditedOffChain(String transactionId, String chainId, BigDecimal balanceAfter) {
        return new SettlementResult(true, "CREDITED_OFFCHAIN", transactionId, chainId, balanceAfter, null);
    }

    public static SettlementResult queuedOnChain(String chainId) {
        return new SettlementResult(true, "QUEUED_ONCHAIN", null, chainId, null, null);
    }

    public static SettlementResult failed(String reason) {
        return new SettlementResult(false, "SETTLEMENT_FAILED", null, "offchain", null, reason);
    }
}
