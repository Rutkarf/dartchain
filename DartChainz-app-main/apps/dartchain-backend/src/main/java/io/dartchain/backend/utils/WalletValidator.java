package io.dartchain.backend.utils;

public final class WalletValidator {

    private WalletValidator() {
    }

    public static String normalize(String walletAddress) {
        if (walletAddress == null) {
            return null;
        }
        return walletAddress.trim();
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
}