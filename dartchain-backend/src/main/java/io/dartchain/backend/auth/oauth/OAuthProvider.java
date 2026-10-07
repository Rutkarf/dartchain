package io.dartchain.backend.auth.oauth;

import java.util.Locale;

public enum OAuthProvider {
    GOOGLE("google", "Google"),
    META("meta", "Meta"),
    APPLE("apple", "Apple"),
    MICROSOFT("microsoft", "Microsoft"),
    GITHUB("github", "GitHub"),
    X("x", "X"),
    DISCORD("discord", "Discord");

    private final String id;
    private final String label;

    OAuthProvider(String id, String label) {
        this.id = id;
        this.label = label;
    }

    public String id() {
        return id;
    }

    public String label() {
        return label;
    }

    public static OAuthProvider fromId(String raw) {
        if (raw == null || raw.isBlank()) {
            throw new IllegalArgumentException("Provider OAuth requis");
        }

        String normalized = raw.trim().toLowerCase(Locale.ROOT);
        for (OAuthProvider provider : values()) {
            if (provider.id.equals(normalized)) {
                return provider;
            }
        }

        throw new IllegalArgumentException("Provider OAuth inconnu: " + raw);
    }
}
