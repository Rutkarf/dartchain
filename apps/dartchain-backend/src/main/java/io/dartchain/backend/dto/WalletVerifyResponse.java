package io.dartchain.backend.dto;

public record WalletVerifyResponse(
        boolean valid,
        String address,
        String publicKey,
        String signingModel
) {
}
