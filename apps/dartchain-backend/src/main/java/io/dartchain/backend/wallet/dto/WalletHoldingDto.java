package io.dartchain.backend.wallet.dto;

public record WalletHoldingDto(
        String token,
        String balance,
        String chainBalance,
        String ledgerAdjustment,
        boolean nativeToken
) {
}
