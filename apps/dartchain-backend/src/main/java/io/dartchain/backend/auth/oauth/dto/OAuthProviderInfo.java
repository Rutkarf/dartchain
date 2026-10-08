package io.dartchain.backend.auth.oauth.dto;

public record OAuthProviderInfo(
        String id,
        String label,
        boolean enabled,
        boolean mock
) {
    public OAuthProviderInfo(String id, String label, boolean enabled) {
        this(id, label, enabled, false);
    }
}
