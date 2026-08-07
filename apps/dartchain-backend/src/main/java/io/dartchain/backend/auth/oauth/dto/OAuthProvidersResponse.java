package io.dartchain.backend.auth.oauth.dto;

import java.util.List;

public record OAuthProvidersResponse(List<OAuthProviderInfo> providers) {
}
