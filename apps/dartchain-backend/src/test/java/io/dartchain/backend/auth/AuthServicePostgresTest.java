package io.dartchain.backend.auth;

import io.dartchain.backend.auth.dto.LinkWalletRequest;
import io.dartchain.backend.auth.dto.LoginRequest;
import io.dartchain.backend.auth.dto.RegisterRequest;
import io.dartchain.backend.shared.utils.CryptoUtils;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.test.context.ActiveProfiles;
import org.springframework.test.context.DynamicPropertyRegistry;
import org.springframework.test.context.DynamicPropertySource;
import org.testcontainers.containers.PostgreSQLContainer;
import org.testcontainers.junit.jupiter.Container;
import org.testcontainers.junit.jupiter.Testcontainers;

import io.dartchain.backend.support.AuthServiceTestSupport;

import java.security.KeyPair;

import static org.assertj.core.api.Assertions.assertThat;

@SpringBootTest
@ActiveProfiles("postgres")
@Testcontainers
class AuthServicePostgresTest {

    @Container
    static PostgreSQLContainer<?> postgres = new PostgreSQLContainer<>("postgres:16")
            .withDatabaseName("dartchain")
            .withUsername("dartchain")
            .withPassword("dartchain");

    @DynamicPropertySource
    static void registerDataSource(DynamicPropertyRegistry registry) {
        registry.add("spring.datasource.url", postgres::getJdbcUrl);
        registry.add("spring.datasource.username", postgres::getUsername);
        registry.add("spring.datasource.password", postgres::getPassword);
        registry.add("dartchain.persistence.mode", () -> "postgres");
    }

    @Autowired
    private AuthService authService;

    @Test
    void registerLoginAndMePersistAcrossSessionStore() {
        authService.register(
                new RegisterRequest("pguser", "pguser@dartchain.dev", "password123"),
                AuthServiceTestSupport.LOCAL_IP
        );

        var loginResponse = authService.login(new LoginRequest("pguser", "password123"), AuthServiceTestSupport.LOCAL_IP);
        assertThat(loginResponse.token()).isNotBlank();

        var profile = authService.me("Bearer " + loginResponse.token());
        assertThat(profile.username()).isEqualTo("pguser");
        assertThat(profile.email()).isEqualTo("pguser@dartchain.dev");
    }

    @Test
    void linksWalletToAccountInPostgres() throws Exception {
        authService.register(
                new RegisterRequest("pgalice", "pgalice@dartchain.dev", "password123"),
                AuthServiceTestSupport.LOCAL_IP
        );
        var loginResponse = authService.login(new LoginRequest("pgalice", "password123"), AuthServiceTestSupport.LOCAL_IP);

        KeyPair keyPair = CryptoUtils.generateKeyPair();
        String publicKey = CryptoUtils.publicKeyToBase64(keyPair.getPublic());
        String walletAddress = CryptoUtils.addressFromPublicKey(keyPair.getPublic());

        var profile = authService.linkWallet(
                "Bearer " + loginResponse.token(),
                new LinkWalletRequest(walletAddress, publicKey)
        );

        assertThat(profile.walletAddress()).isEqualTo(walletAddress);
        assertThat(profile.walletPublicKey()).isEqualTo(publicKey);

        var afterRelogin = authService.me("Bearer " + loginResponse.token());
        assertThat(afterRelogin.walletAddress()).isEqualTo(walletAddress);
    }
}
