package io.dartchain.backend.auth.oauth.dto;

public record OAuthProviderInfo(
        String id,
        String label,
        boolean enabled
) {
}
