package io.dartchain.backend.auth.oauth.store;

import io.dartchain.backend.auth.oauth.OAuthIdentity;
import io.dartchain.backend.auth.oauth.OAuthProvider;
import org.springframework.boot.autoconfigure.condition.ConditionalOnProperty;
import org.springframework.stereotype.Component;

import java.util.ArrayList;
import java.util.List;
import java.util.Optional;

@Component
@ConditionalOnProperty(name = "dartchain.persistence.mode", havingValue = "memory", matchIfMissing = true)
public class InMemoryOAuthIdentityStore implements OAuthIdentityStore {

    private final List<OAuthIdentity> identities = new ArrayList<>();

    @Override
    public synchronized Optional<OAuthIdentity> findByProviderSubject(OAuthProvider provider, String providerSubject) {
        return identities.stream()
                .filter(identity -> identity.provider() == provider
                        && identity.providerSubject().equals(providerSubject))
                .findFirst();
    }

    @Override
    public synchronized OAuthIdentity create(OAuthIdentity identity) {
        identities.add(identity);
        return identity;
    }
}
