package io.dartchain.backend.auth.application;

import java.util.Locale;

public final class AuthNormalizer {

    private AuthNormalizer() {
    }

    public static String normalizeUsername(String username) {
        return username == null ? "" : username.trim().toLowerCase(Locale.ROOT);
    }

    public static String normalizeEmail(String email) {
        return email == null ? "" : email.trim().toLowerCase(Locale.ROOT);
    }
}
