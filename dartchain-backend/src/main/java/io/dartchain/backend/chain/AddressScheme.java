package io.dartchain.backend.chain;

/**
 * Schéma d'adresse DartChain — legacy P-256 ou EVM-compatible (Keccak/secp256k1).
 */
public enum AddressScheme {
    LEGACY,
    EVM;

    public static AddressScheme fromAddress(String address) {
        if (address != null && address.startsWith("0x") && address.length() == 42) {
            return EVM;
        }
        return LEGACY;
    }
}
