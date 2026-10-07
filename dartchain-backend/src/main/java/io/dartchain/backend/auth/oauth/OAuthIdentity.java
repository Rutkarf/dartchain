package io.dartchain.backend.auth.oauth;

public record OAuthIdentity(
        String id,
        String userId,
        OAuthProvider provider,
        String providerSubject,
        long createdAt
) {
}
