package io.dartchain.backend.quests;

import io.dartchain.backend.quests.application.QuestService;
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

@Testcontainers(disabledWithoutDocker = true)
@SpringBootTest
@ActiveProfiles("postgres")
class QuestServicePostgresTest {

    @Container
    static PostgreSQLContainer<?> postgres = new PostgreSQLContainer<>("postgres:16")
            .withDatabaseName("dartchain")
            .withUsername("dartchain")
            .withPassword("dartchain");

    @DynamicPropertySource
    static void datasourceProperties(DynamicPropertyRegistry registry) {
        registry.add("spring.datasource.url", postgres::getJdbcUrl);
        registry.add("spring.datasource.username", postgres::getUsername);
        registry.add("spring.datasource.password", postgres::getPassword);
        registry.add("dartchain.persistence.mode", () -> "postgres");
    }

    @Autowired
    private io.dartchain.backend.auth.AuthService authService;

    @Autowired
    private QuestService questService;

    @Test
    void persistsQuestProgressInPostgres() throws Exception {
        authService.register(
                new RegisterRequest("questpg", "questpg@dartchain.dev", "password123"),
                AuthServiceTestSupport.LOCAL_IP
        );
        var login = authService.login(new LoginRequest("questpg", "password123"), AuthServiceTestSupport.LOCAL_IP);
        String authHeader = "Bearer " + login.token();

        KeyPair keyPair = CryptoUtils.generateKeyPair();
        String walletAddress = CryptoUtils.addressFromPublicKey(keyPair.getPublic());
        authService.linkWallet(
                authHeader,
                new LinkWalletRequest(walletAddress, CryptoUtils.publicKeyToBase64(keyPair.getPublic()))
        );

        questService.recordProgressForUserId(login.user().id(), "faucet-claim", 1);

        var reloaded = questService.getState(authHeader);
        assertThat(reloaded.tasks().get("faucet-claim").progress()).isEqualTo(1);
        assertThat(reloaded.tasks().get("faucet-claim").claimed()).isTrue();
    }
}
