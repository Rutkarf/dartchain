package io.dartchain.backend.chain.dto;

public record EvmWalletGenerateResponse(
        String address,
        String publicKey,
        String privateKey,
        String signingModel,
        String addressScheme,
        long chainId
) {
}
