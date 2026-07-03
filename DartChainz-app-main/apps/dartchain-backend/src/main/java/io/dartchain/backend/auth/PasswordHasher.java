package io.dartchain.backend.auth;

import io.dartchain.backend.utils.HashUtils;

import java.util.UUID;

public final class PasswordHasher {

    private PasswordHasher() {
    }

    public static String generateSalt() {
        return UUID.randomUUID().toString();
    }

    public static String hash(String password, String salt) {
        return HashUtils.sha256(salt + "|" + password);
    }

    public static boolean verify(String password, String salt, String expectedHash) {
        if (password == null || salt == null || expectedHash == null) {
            return false;
        }
        return hash(password, salt).equals(expectedHash);
    }
}
