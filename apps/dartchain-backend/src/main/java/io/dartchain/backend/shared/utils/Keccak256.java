package io.dartchain.backend.shared.utils;

import org.bouncycastle.jcajce.provider.digest.Keccak;

/**
 * Keccak-256 (Ethereum/EVM) — via BouncyCastle déjà présent dans le projet.
 */
public final class Keccak256 {

    private Keccak256() {
    }

    public static byte[] hash(byte[] input) {
        Keccak.Digest256 digest = new Keccak.Digest256();
        return digest.digest(input);
    }

    public static String hashHex(byte[] input) {
        byte[] hash = hash(input);
        StringBuilder hex = new StringBuilder(hash.length * 2);
        for (byte value : hash) {
            hex.append(String.format("%02x", value));
        }
        return hex.toString();
    }
}
