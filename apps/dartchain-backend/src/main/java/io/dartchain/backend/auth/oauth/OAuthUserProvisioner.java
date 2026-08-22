package io.dartchain.backend.auth.oauth;

import io.dartchain.backend.auth.application.AuthException;
import io.dartchain.backend.auth.application.AuthNormalizer;
import io.dartchain.backend.auth.application.PasswordHasher;
import io.dartchain.backend.auth.model.UserAccount;
import io.dartchain.backend.auth.oauth.store.OAuthIdentityStore;
import io.dartchain.backend.auth.store.UserAccountStore;
import org.springframework.stereotype.Component;

import java.util.Locale;
import java.util.Optional;
import java.util.UUID;
import java.util.regex.Pattern;

/**
 * Création / liaison de comptes locaux à partir d'identités OAuth externes.
 */
@Component
public class OAuthUserProvisioner {

    static final String OAUTH_PASSWORD_SENTINEL = "$OAUTH$";
    private static final Pattern USERNAME_SANITIZER = Pattern.compile("[^A-Za-z0-9_]+");

    private final UserAccountStore userAccountStore;
    private final OAuthIdentityStore oauthIdentityStore;

    public OAuthUserProvisioner(UserAccountStore userAccountStore, OAuthIdentityStore oauthIdentityStore) {
        this.userAccountStore = userAccountStore;
        this.oauthIdentityStore = oauthIdentityStore;
    }

    public UserAccount resolveOrCreate(
            OAuthProvider provider,
            String providerSubject,
            String email,
            String displayName
    ) {
        Optional<OAuthIdentity> existingIdentity = oauthIdentityStore.findByProviderSubject(provider, providerSubject);
        if (existingIdentity.isPresent()) {
            return userAccountStore.findById(existingIdentity.get().userId())
                    .orElseThrow(() -> new AuthException(404, "Compte OAuth introuvable"));
        }

        String normalizedEmail = AuthNormalizer.normalizeEmail(email);
        Optional<UserAccount> byEmail = userAccountStore.findByEmail(normalizedEmail);
        if (byEmail.isPresent()) {
            UserAccount linked = byEmail.get();
            if (!PasswordHasher.isOAuthAccount(linked.getPasswordHash())) {
                throw new AuthException(409, "Un compte existe déjà avec cet email. Connectez-vous avec votre mot de passe.");
            }
            linkIdentity(linked.getId(), provider, providerSubject);
            return linked;
        }

        UserAccount account = new UserAccount(
                UUID.randomUUID().toString(),
                generateUsername(normalizedEmail, displayName),
                normalizedEmail,
                OAUTH_PASSWORD_SENTINEL,
                "",
                System.currentTimeMillis()
        );
        userAccountStore.create(account);
        linkIdentity(account.getId(), provider, providerSubject);
        return account;
    }

    private void linkIdentity(String userId, OAuthProvider provider, String providerSubject) {
        oauthIdentityStore.create(new OAuthIdentity(
                UUID.randomUUID().toString(),
                userId,
                provider,
                providerSubject,
                System.currentTimeMillis()
        ));
    }

    String generateUsername(String email, String displayName) {
        String base = USERNAME_SANITIZER.matcher(
                displayName == null || displayName.isBlank()
                        ? email.substring(0, email.indexOf('@'))
                        : displayName
        ).replaceAll("_").toLowerCase(Locale.ROOT);

        if (base.length() < 3) {
            base = "user";
        }
        if (base.length() > 24) {
            base = base.substring(0, 24);
        }

        String candidate = base;
        int attempt = 0;
        while (userAccountStore.findByUsername(candidate).isPresent()) {
            attempt++;
            candidate = base + attempt;
            if (candidate.length() > 32) {
                candidate = base.substring(0, Math.max(3, 32 - String.valueOf(attempt).length())) + attempt;
            }
        }

        return candidate;
    }
}
