package io.dartchain.backend.auth.oauth.store;

import io.dartchain.backend.auth.oauth.OAuthIdentity;
import io.dartchain.backend.auth.oauth.OAuthProvider;

import java.util.Optional;

public interface OAuthIdentityStore {

    Optional<OAuthIdentity> findByProviderSubject(OAuthProvider provider, String providerSubject);

    OAuthIdentity create(OAuthIdentity identity);
}
