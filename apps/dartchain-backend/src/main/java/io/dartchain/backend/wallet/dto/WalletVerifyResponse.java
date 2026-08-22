package io.dartchain.backend.wallet.dto;

public record WalletVerifyResponse(
        boolean valid,
        String address,
        String publicKey,
        String signingModel
) {
}
