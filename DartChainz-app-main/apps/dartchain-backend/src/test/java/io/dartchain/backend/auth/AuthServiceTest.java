package io.dartchain.backend.auth;

import com.fasterxml.jackson.databind.ObjectMapper;
import io.dartchain.backend.auth.dto.LinkWalletRequest;
import io.dartchain.backend.auth.dto.LoginRequest;
import io.dartchain.backend.auth.dto.RegisterRequest;
import io.dartchain.backend.utils.CryptoUtils;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.io.TempDir;

import java.nio.file.Path;
import java.security.KeyPair;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;

class AuthServiceTest {

    @TempDir
    Path tempDir;

    private AuthService authService;

    @BeforeEach
    void setUp() {
        JsonUserAccountStore userStore = new JsonUserAccountStore(
                new ObjectMapper(),
                tempDir.resolve("auth-users.json").toString()
        );
        userStore.loadFromDisk();
        authService = new AuthService(userStore, new InMemorySessionStore(3600));
    }

    @Test
    void registerLoginAndMe() {
        authService.register(new RegisterRequest("rutkarf", "rutkarf@dartchain.dev", "password123"));

        var loginResponse = authService.login(new LoginRequest("rutkarf", "password123"));
        assertThat(loginResponse.token()).isNotBlank();
        assertThat(loginResponse.user().username()).isEqualTo("rutkarf");

        var profile = authService.me("Bearer " + loginResponse.token());
        assertThat(profile.email()).isEqualTo("rutkarf@dartchain.dev");
        assertThat(profile.walletAddress()).isNull();
    }

    @Test
    void linksWalletToAccount() throws Exception {
        authService.register(new RegisterRequest("alice", "alice@dartchain.dev", "password123"));
        var loginResponse = authService.login(new LoginRequest("alice", "password123"));

        KeyPair keyPair = CryptoUtils.generateKeyPair();
        String publicKey = CryptoUtils.publicKeyToBase64(keyPair.getPublic());
        String walletAddress = CryptoUtils.addressFromPublicKey(keyPair.getPublic());

        var profile = authService.linkWallet(
                "Bearer " + loginResponse.token(),
                new LinkWalletRequest(walletAddress, publicKey)
        );

        assertThat(profile.walletAddress()).isEqualTo(walletAddress);
        assertThat(profile.walletPublicKey()).isEqualTo(publicKey);
    }

    @Test
    void rejectsDuplicateUsername() {
        authService.register(new RegisterRequest("alice", "alice@dartchain.dev", "password123"));

        assertThatThrownBy(() ->
                authService.register(new RegisterRequest("alice", "bob@dartchain.dev", "password123"))
        )
                .isInstanceOf(AuthException.class)
                .extracting("statusCode")
                .isEqualTo(409);
    }

    @Test
    void rejectsInvalidCredentials() {
        authService.register(new RegisterRequest("alice", "alice@dartchain.dev", "password123"));

        assertThatThrownBy(() ->
                authService.login(new LoginRequest("alice", "wrong-password"))
        )
                .isInstanceOf(AuthException.class)
                .extracting("statusCode")
                .isEqualTo(401);
    }
}
