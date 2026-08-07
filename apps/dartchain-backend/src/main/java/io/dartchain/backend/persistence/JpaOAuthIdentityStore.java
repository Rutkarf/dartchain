package io.dartchain.backend.persistence;

import io.dartchain.backend.auth.oauth.OAuthIdentity;
import io.dartchain.backend.auth.oauth.OAuthProvider;
import io.dartchain.backend.auth.oauth.store.OAuthIdentityStore;
import io.dartchain.backend.persistence.entity.OAuthIdentityEntity;
import io.dartchain.backend.persistence.repository.OAuthIdentityJpaRepository;
import org.springframework.boot.autoconfigure.condition.ConditionalOnProperty;
import org.springframework.stereotype.Component;
import org.springframework.transaction.annotation.Transactional;

import java.time.Instant;
import java.util.Optional;
import java.util.UUID;

@Component
@ConditionalOnProperty(name = "dartchain.persistence.mode", havingValue = "postgres")
public class JpaOAuthIdentityStore implements OAuthIdentityStore {

    private final OAuthIdentityJpaRepository repository;

    public JpaOAuthIdentityStore(OAuthIdentityJpaRepository repository) {
        this.repository = repository;
    }

    @Override
    @Transactional(readOnly = true)
    public Optional<OAuthIdentity> findByProviderSubject(OAuthProvider provider, String providerSubject) {
        return repository
                .findByProviderAndProviderSubject(provider.id(), providerSubject)
                .map(JpaOAuthIdentityStore::toIdentity);
    }

    @Override
    @Transactional
    public OAuthIdentity create(OAuthIdentity identity) {
        OAuthIdentityEntity entity = new OAuthIdentityEntity();
        entity.setId(UUID.fromString(identity.id()));
        entity.setUserId(UUID.fromString(identity.userId()));
        entity.setProvider(identity.provider().id());
        entity.setProviderSubject(identity.providerSubject());
        entity.setCreatedAt(Instant.ofEpochMilli(identity.createdAt()));
        return toIdentity(repository.save(entity));
    }

    private static OAuthIdentity toIdentity(OAuthIdentityEntity entity) {
        return new OAuthIdentity(
                entity.getId().toString(),
                entity.getUserId().toString(),
                OAuthProvider.fromId(entity.getProvider()),
                entity.getProviderSubject(),
                entity.getCreatedAt().toEpochMilli()
        );
    }
}
