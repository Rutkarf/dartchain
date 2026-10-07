package io.dartchain.backend.chain.dto;

public record ChainConfigResponse(
        long chainId,
        String networkName,
        String nativeToken,
        String addressSchemeDefault,
        String signingPayloadVersion,
        boolean evmCompatible
) {
}
