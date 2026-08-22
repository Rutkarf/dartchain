package io.dartchain.backend.auth.oauth;

import com.fasterxml.jackson.databind.ObjectMapper;
import io.dartchain.backend.auth.application.AuthException;
import io.dartchain.backend.auth.model.UserAccount;
import io.dartchain.backend.auth.oauth.store.InMemoryOAuthIdentityStore;
import io.dartchain.backend.auth.persistence.JsonUserAccountStore;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.io.TempDir;

import java.nio.file.Path;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;

class OAuthUserProvisionerTest {

    @TempDir
    Path tempDir;

    private JsonUserAccountStore userStore;
    private OAuthUserProvisioner provisioner;

    @BeforeEach
    void setUp() {
        userStore = new JsonUserAccountStore(
                new ObjectMapper(),
                tempDir.resolve("auth-users.json").toString()
        );
        userStore.loadFromDisk();
        provisioner = new OAuthUserProvisioner(userStore, new InMemoryOAuthIdentityStore());
    }

    @Test
    void createsOAuthAccountWithSanitizedUsername() {
        UserAccount account = provisioner.resolveOrCreate(
                OAuthProvider.GOOGLE,
                "google-subject-1",
                "alice@dartchain.dev",
                "Alice Smith"
        );

        assertThat(account.getUsername()).isEqualTo("alice_smith");
        assertThat(account.getEmail()).isEqualTo("alice@dartchain.dev");
        assertThat(account.getPasswordHash()).isEqualTo(OAuthUserProvisioner.OAUTH_PASSWORD_SENTINEL);
    }

    @Test
    void reusesExistingIdentityForSameProviderSubject() {
        UserAccount first = provisioner.resolveOrCreate(
                OAuthProvider.GITHUB,
                "gh-42",
                "dev@dartchain.dev",
                "Dev User"
        );
        UserAccount second = provisioner.resolveOrCreate(
                OAuthProvider.GITHUB,
                "gh-42",
                "other@dartchain.dev",
                "Other"
        );

        assertThat(second.getId()).isEqualTo(first.getId());
    }

    @Test
    void rejectsEmailAlreadyUsedByPasswordAccount() {
        UserAccount passwordAccount = new UserAccount(
                "u1",
                "alice",
                "alice@dartchain.dev",
                "$2a$10$hash",
                "",
                System.currentTimeMillis()
        );
        userStore.create(passwordAccount);

        assertThatThrownBy(() -> provisioner.resolveOrCreate(
                OAuthProvider.GOOGLE,
                "google-new",
                "alice@dartchain.dev",
                "Alice"
        ))
                .isInstanceOf(AuthException.class)
                .extracting("statusCode")
                .isEqualTo(409);
    }
}
