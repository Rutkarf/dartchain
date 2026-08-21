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

    /** Pièce accrédée au faucet pending — aucun bloc / mempool. */
    public static SettlementResult creditedFaucetPending(String accrualId, BigDecimal pendingBalanceAfter) {
        return new SettlementResult(
                true,
                "CREDITED_FAUCET_PENDING",
                accrualId,
                "faucet-pending",
                pendingBalanceAfter,
                null
        );
    }

    public static SettlementResult queuedOnChain(String chainId) {
        return new SettlementResult(true, "QUEUED_ONCHAIN", null, chainId, null, null);
    }

    public static SettlementResult failed(String reason) {
        return new SettlementResult(false, "SETTLEMENT_FAILED", null, "offchain", null, reason);
    }
}
