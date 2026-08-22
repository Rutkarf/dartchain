package io.dartchain.backend.auth;

import io.dartchain.backend.shared.utils.HashUtils;
import org.springframework.security.crypto.bcrypt.BCryptPasswordEncoder;

import java.util.UUID;

public final class PasswordHasher {

    private static final BCryptPasswordEncoder BCRYPT = new BCryptPasswordEncoder();

    private PasswordHasher() {
    }

    public static String generateSalt() {
        return UUID.randomUUID().toString();
    }

    public static boolean isBcryptHash(String hash) {
        return hash != null && hash.startsWith("$2");
    }

    public static boolean isOAuthAccount(String hash) {
        return "$OAUTH$".equals(hash);
    }

    public static String hashBcrypt(String password) {
        return BCRYPT.encode(password);
    }

    public static String hashLegacy(String password, String salt) {
        return HashUtils.sha256(salt + "|" + password);
    }

    public static boolean verify(String password, String salt, String expectedHash) {
        if (password == null || expectedHash == null) {
            return false;
        }

        if (isBcryptHash(expectedHash)) {
            return BCRYPT.matches(password, expectedHash);
        }

        if (salt == null) {
            return false;
        }

        return hashLegacy(password, salt).equals(expectedHash);
    }
}
