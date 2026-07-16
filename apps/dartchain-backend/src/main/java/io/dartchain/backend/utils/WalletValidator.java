package io.dartchain.backend.utils;

import io.dartchain.backend.chain.AddressScheme;

public final class WalletValidator {

    private WalletValidator() {
    }

    public static String normalize(String walletAddress) {
        if (walletAddress == null) {
            return null;
        }

        String trimmed = walletAddress.trim();
        if (trimmed.startsWith("0x") || trimmed.startsWith("0X")) {
            return "0x" + trimmed.substring(2).toLowerCase();
        }

        return trimmed;
    }

    public static boolean isValid(String walletAddress, String expectedPrefix) {
        if (walletAddress == null || walletAddress.isBlank()) {
            return false;
        }

        if (walletAddress.contains(" ")) {
            return false;
        }

        if (walletAddress.length() < 6 || walletAddress.length() > 128) {
            return false;
        }

        if (expectedPrefix != null && !expectedPrefix.isBlank()) {
            return walletAddress.startsWith(expectedPrefix);
        }

        return true;
    }

    public static boolean isValidBlockchainAddress(String walletAddress) {
        if (walletAddress == null || walletAddress.isBlank() || walletAddress.contains(" ")) {
            return false;
        }

        if (isEvmAddress(walletAddress)) {
            return walletAddress.substring(2).matches("[a-f0-9]{40}");
        }

        if (walletAddress.length() < 40 || walletAddress.length() > 128) {
            return false;
        }

        return walletAddress.matches("[a-fA-F0-9]+");
    }

    public static boolean isEvmAddress(String walletAddress) {
        String normalized = normalize(walletAddress);
        return normalized != null
                && normalized.startsWith("0x")
                && normalized.length() == 42;
    }

    public static AddressScheme detectScheme(String walletAddress) {
        return AddressScheme.fromAddress(normalize(walletAddress));
    }
}
