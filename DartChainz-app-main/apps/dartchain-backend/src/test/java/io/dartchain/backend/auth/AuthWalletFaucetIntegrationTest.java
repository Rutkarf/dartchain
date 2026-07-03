package io.dartchain.backend.auth;

import com.fasterxml.jackson.databind.ObjectMapper;
import io.dartchain.backend.auth.dto.LinkWalletRequest;
import io.dartchain.backend.auth.dto.LoginRequest;
import io.dartchain.backend.auth.dto.RegisterRequest;
import io.dartchain.backend.config.FaucetConfig;
import io.dartchain.backend.dto.FaucetClaimRequest;
import io.dartchain.backend.service.BlockchainService;
import io.dartchain.backend.service.BlockchainValidationService;
import io.dartchain.backend.service.FaucetServiceImpl;
import io.dartchain.backend.service.TransactionPoolService;
import io.dartchain.backend.showcase.service.MarketChartService;
import io.dartchain.backend.utils.CryptoUtils;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.io.TempDir;

import java.math.BigDecimal;
import java.nio.file.Path;
import java.security.KeyPair;
import java.time.Duration;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.when;

class AuthWalletFaucetIntegrationTest {

    @TempDir
    Path tempDir;

    private AuthService authService;
    private BlockchainService blockchainService;
    private FaucetServiceImpl faucetService;

    @BeforeEach
    void setUp() {
        JsonUserAccountStore userStore = new JsonUserAccountStore(
                new ObjectMapper(),
                tempDir.resolve("auth-users.json").toString()
        );
        userStore.loadFromDisk();

        InMemorySessionStore sessionStore = new InMemorySessionStore(3600);
        authService = new AuthService(userStore, sessionStore);

        MarketChartService marketChartService = mock(MarketChartService.class);
        TransactionPoolService transactionPoolService = new TransactionPoolService();
        blockchainService = new BlockchainService(
                new BlockchainValidationService(),
                marketChartService,
                transactionPoolService
        );

        FaucetConfig faucetConfig = mock(FaucetConfig.class);
        when(faucetConfig.getAmount()).thenReturn(new BigDecimal("10"));
        when(faucetConfig.getCooldownDuration()).thenReturn(Duration.ofSeconds(1));

        faucetService = new FaucetServiceImpl(faucetConfig, blockchainService, authService);
    }

    @Test
    void linkWalletAndCreditFaucetOnChain() throws Exception {
        authService.register(new RegisterRequest("alice", "alice@dartchain.dev", "password123"));
        var login = authService.login(new LoginRequest("alice", "password123"));

        KeyPair keyPair = CryptoUtils.generateKeyPair();
        String publicKey = CryptoUtils.publicKeyToBase64(keyPair.getPublic());
        String walletAddress = CryptoUtils.addressFromPublicKey(keyPair.getPublic());

        authService.linkWallet(
                "Bearer " + login.token(),
                new LinkWalletRequest(walletAddress, publicKey)
        );

        var claim = faucetService.claim(
                faucetClaimRequest(walletAddress, "test-client"),
                "Bearer " + login.token()
        );

        assertThat(claim.isSuccess()).isTrue();
        assertThat(claim.getTxHash()).isNotBlank();
        assertThat(blockchainService.getBalance(walletAddress)).isEqualByComparingTo("10");
    }

    @Test
    void rejectsFaucetClaimForUnlinkedWallet() throws Exception {
        authService.register(new RegisterRequest("bob", "bob@dartchain.dev", "password123"));
        var login = authService.login(new LoginRequest("bob", "password123"));

        KeyPair keyPair = CryptoUtils.generateKeyPair();
        String walletAddress = CryptoUtils.addressFromPublicKey(keyPair.getPublic());

        assertThatThrownBy(() -> faucetService.claim(
                faucetClaimRequest(walletAddress, "test-client"),
                "Bearer " + login.token()
        ))
                .isInstanceOf(AuthException.class)
                .extracting("statusCode")
                .isEqualTo(403);
    }

    private static FaucetClaimRequest faucetClaimRequest(String walletAddress, String clientId) {
        FaucetClaimRequest request = new FaucetClaimRequest();
        request.setWalletAddress(walletAddress);
        request.setClientId(clientId);
        return request;
    }
}
