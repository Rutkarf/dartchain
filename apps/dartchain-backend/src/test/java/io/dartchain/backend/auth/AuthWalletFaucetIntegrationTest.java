package io.dartchain.backend.auth;

import com.fasterxml.jackson.databind.ObjectMapper;
import io.dartchain.backend.auth.dto.LinkWalletRequest;
import io.dartchain.backend.auth.dto.LoginRequest;
import io.dartchain.backend.auth.dto.RegisterRequest;
import io.dartchain.backend.blockchain.JsonBlockchainStateStore;
import io.dartchain.backend.config.FaucetConfig;
import io.dartchain.backend.faucet.dto.FaucetClaimRequest;
import io.dartchain.backend.faucet.JsonFaucetClaimStore;
import io.dartchain.backend.faucet.JsonFaucetPendingBalanceStore;
import io.dartchain.backend.faucet.store.FaucetPendingBalanceStore;
import io.dartchain.backend.quests.JsonQuestProgressStore;
import io.dartchain.backend.quests.QuestService;
import io.dartchain.backend.blockchain.application.BlockchainService;
import io.dartchain.backend.support.AuthServiceTestSupport;
import io.dartchain.backend.support.BlockchainTestSupport;
import io.dartchain.backend.blockchain.application.BlockchainValidationService;
import io.dartchain.backend.faucet.application.FaucetServiceImpl;
import io.dartchain.backend.blockchain.application.TransactionPoolService;
import io.dartchain.backend.showcase.application.MarketChartService;
import io.dartchain.backend.shared.utils.CryptoUtils;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.io.TempDir;
import org.springframework.context.ApplicationEventPublisher;

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

    private final ObjectMapper objectMapper = new ObjectMapper();

    private AuthService authService;
    private JsonUserAccountStore userStore;
    private BlockchainService blockchainService;
    private FaucetConfig faucetConfig;
    private JsonFaucetClaimStore claimStore;
    private FaucetPendingBalanceStore pendingBalanceStore;
    private FaucetServiceImpl faucetService;
    private TransactionPoolService transactionPoolService;

    @BeforeEach
    void setUp() {
        userStore = new JsonUserAccountStore(
                objectMapper,
                tempDir.resolve("auth-users.json").toString()
        );
        userStore.loadFromDisk();

        authService = AuthServiceTestSupport.createJsonAuthService(userStore);

        var blockchainStore = new JsonBlockchainStateStore(
                objectMapper,
                tempDir.resolve("blockchain-state.json").toString()
        );
        blockchainStore.loadFromDisk();
        MarketChartService marketChartService = mock(MarketChartService.class);
        transactionPoolService = BlockchainTestSupport.newTransactionPool(blockchainStore);
        blockchainService = BlockchainTestSupport.newBlockchainService(
                blockchainStore,
                new BlockchainValidationService(),
                marketChartService,
                transactionPoolService
        );

        faucetConfig = mock(FaucetConfig.class);
        when(faucetConfig.getAmount()).thenReturn(new BigDecimal("10"));
        when(faucetConfig.getCooldownDuration()).thenReturn(Duration.ofSeconds(60));

        claimStore = new JsonFaucetClaimStore(
                objectMapper,
                tempDir.resolve("faucet-claims.json").toString()
        );
        claimStore.loadFromDisk();

        pendingBalanceStore = new JsonFaucetPendingBalanceStore(
                objectMapper,
                tempDir.resolve("faucet-pending.json").toString()
        );
        ((JsonFaucetPendingBalanceStore) pendingBalanceStore).loadFromDisk();

        faucetService = new FaucetServiceImpl(
                faucetConfig,
                blockchainService,
                authService,
                claimStore,
                pendingBalanceStore
        );
    }

    @Test
    void faucetClaimsPersistAcrossReload() throws Exception {
        String walletAddress = registerLinkWalletAndClaim("persist-user");

        assertThat(faucetService.getState(walletAddress).isEligible()).isFalse();
        assertThat(faucetService.getState(walletAddress).getCooldownSeconds()).isGreaterThan(0);

        JsonFaucetClaimStore reloadedStore = new JsonFaucetClaimStore(
                objectMapper,
                tempDir.resolve("faucet-claims.json").toString()
        );
        reloadedStore.loadFromDisk();

        FaucetServiceImpl reloadedService = new FaucetServiceImpl(
                faucetConfig,
                blockchainService,
                authService,
                reloadedStore,
                pendingBalanceStore
        );

        assertThat(reloadedService.getState(walletAddress).isEligible()).isFalse();
        assertThat(reloadedStore.findAllOrderByClaimedAtDesc()).hasSize(1);
    }

    @Test
    void faucetClaimQueuesMempoolThenMineCreditsBalance() throws Exception {
        JsonQuestProgressStore questStore = new JsonQuestProgressStore(
                objectMapper,
                tempDir.resolve("quest-progress-faucet-amount.json").toString()
        );
        questStore.loadFromDisk();
        ApplicationEventPublisher eventPublisher = mock(ApplicationEventPublisher.class);
        QuestService questService = new QuestService(authService, questStore, blockchainService, eventPublisher);
        authService = AuthServiceTestSupport.createJsonAuthService(userStore, questService);
        faucetService = new FaucetServiceImpl(
                faucetConfig,
                blockchainService,
                authService,
                claimStore,
                pendingBalanceStore,
                questService
        );

        authService.register(
                new RegisterRequest("amount-user", "amount@dartchain.dev", "password123"),
                AuthServiceTestSupport.LOCAL_IP
        );
        var login = authService.login(
                new LoginRequest("amount-user", "password123"),
                AuthServiceTestSupport.LOCAL_IP
        );
        KeyPair keyPair = CryptoUtils.generateKeyPair();
        String walletAddress = CryptoUtils.addressFromPublicKey(keyPair.getPublic());
        authService.linkWallet(
                "Bearer " + login.token(),
                new LinkWalletRequest(walletAddress, CryptoUtils.publicKeyToBase64(keyPair.getPublic()))
        );

        BigDecimal claimAmount = new BigDecimal("0.00000000000000000000000001");
        pendingBalanceStore.add(walletAddress, claimAmount);

        BigDecimal balanceAfterLink = blockchainService.getBalance(walletAddress);
        int tipBefore = blockchainService.getLatestBlock().getIndex();
        faucetService.claim(
                faucetClaimRequest(walletAddress, "client-amount-user", claimAmount.toPlainString()),
                "Bearer " + login.token()
        );

        // Claim ne mine pas : solde inchangé, tip inchangé, tx en mempool.
        assertThat(blockchainService.getBalance(walletAddress)).isEqualByComparingTo(balanceAfterLink);
        assertThat(blockchainService.getLatestBlock().getIndex()).isEqualTo(tipBefore);
        assertThat(transactionPoolService.getAll().size()).isGreaterThan(0);

        blockchainService.minePendingTransactions(walletAddress);
        assertThat(blockchainService.getBalance(walletAddress))
                .isGreaterThanOrEqualTo(balanceAfterLink.add(claimAmount));
        assertThat(blockchainService.getLatestBlock().getIndex()).isGreaterThan(tipBefore);
    }

    @Test
    void faucetClaimRecordsQuestProgress() throws Exception {
        JsonQuestProgressStore questStore = new JsonQuestProgressStore(
                objectMapper,
                tempDir.resolve("quest-progress-faucet.json").toString()
        );
        questStore.loadFromDisk();
        ApplicationEventPublisher eventPublisher = mock(ApplicationEventPublisher.class);
        QuestService questService = new QuestService(authService, questStore, blockchainService, eventPublisher);
        authService = AuthServiceTestSupport.createJsonAuthService(userStore, questService);
        faucetService = new FaucetServiceImpl(
                faucetConfig,
                blockchainService,
                authService,
                claimStore,
                pendingBalanceStore,
                questService
        );

        String walletAddress = registerLinkWalletAndClaim("quest-user");

        var login = authService.login(new LoginRequest("quest-user", "password123"), AuthServiceTestSupport.LOCAL_IP);
        var questState = questService.getState("Bearer " + login.token());
        assertThat(questState.tasks().get("faucet-claim").progress()).isEqualTo(1);
        assertThat(questState.tasks().get("faucet-claim").claimed()).isTrue();
        assertThat(faucetService.getState(walletAddress).isEligible()).isFalse();
    }

    @Test
    void linkWalletAndClaimQueuesMempool() throws Exception {
        authService.register(new RegisterRequest("alice", "alice@dartchain.dev", "password123"), AuthServiceTestSupport.LOCAL_IP);
        var login = authService.login(new LoginRequest("alice", "password123"), AuthServiceTestSupport.LOCAL_IP);

        KeyPair keyPair = CryptoUtils.generateKeyPair();
        String publicKey = CryptoUtils.publicKeyToBase64(keyPair.getPublic());
        String walletAddress = CryptoUtils.addressFromPublicKey(keyPair.getPublic());

        authService.linkWallet(
                "Bearer " + login.token(),
                new LinkWalletRequest(walletAddress, publicKey)
        );

        BigDecimal claimAmount = new BigDecimal("0.00000000000000000000000042");
        pendingBalanceStore.add(walletAddress, claimAmount);

        BigDecimal balanceAfterLink = blockchainService.getBalance(walletAddress);
        int tipBefore = blockchainService.getLatestBlock().getIndex();
        var claim = faucetService.claim(
                faucetClaimRequest(walletAddress, "test-client", claimAmount.toPlainString()),
                "Bearer " + login.token()
        );

        assertThat(claim.isSuccess()).isTrue();
        assertThat(claim.getTxHash()).isNotBlank();
        assertThat(claim.getAmount()).isEqualTo(claimAmount.toPlainString());
        assertThat(blockchainService.getBalance(walletAddress)).isEqualByComparingTo(balanceAfterLink);
        assertThat(blockchainService.getLatestBlock().getIndex()).isEqualTo(tipBefore);
        assertThat(transactionPoolService.getAll().size()).isGreaterThan(0);
    }

    @Test
    void rejectsFaucetClaimForUnlinkedWallet() throws Exception {
        authService.register(new RegisterRequest("bob", "bob@dartchain.dev", "password123"), AuthServiceTestSupport.LOCAL_IP);
        var login = authService.login(new LoginRequest("bob", "password123"), AuthServiceTestSupport.LOCAL_IP);

        KeyPair keyPair = CryptoUtils.generateKeyPair();
        String walletAddress = CryptoUtils.addressFromPublicKey(keyPair.getPublic());

        assertThatThrownBy(() -> faucetService.claim(
                faucetClaimRequest(walletAddress, "test-client", "0.00000000000000000000000001"),
                "Bearer " + login.token()
        ))
                .isInstanceOf(AuthException.class)
                .extracting("statusCode")
                .isEqualTo(403);
    }

    private String registerLinkWalletAndClaim(String username) throws Exception {
        authService.register(new RegisterRequest(username, username + "@dartchain.dev", "password123"), AuthServiceTestSupport.LOCAL_IP);
        var login = authService.login(new LoginRequest(username, "password123"), AuthServiceTestSupport.LOCAL_IP);

        KeyPair keyPair = CryptoUtils.generateKeyPair();
        String walletAddress = CryptoUtils.addressFromPublicKey(keyPair.getPublic());
        authService.linkWallet(
                "Bearer " + login.token(),
                new LinkWalletRequest(
                        walletAddress,
                        CryptoUtils.publicKeyToBase64(keyPair.getPublic())
                )
        );

        pendingBalanceStore.add(walletAddress, new BigDecimal("0.00000000000000000000000001"));
        faucetService.claim(
                faucetClaimRequest(walletAddress, "client-" + username, "0.00000000000000000000000001"),
                "Bearer " + login.token()
        );

        return walletAddress;
    }

    private static FaucetClaimRequest faucetClaimRequest(
            String walletAddress,
            String clientId,
            String amount
    ) {
        FaucetClaimRequest request = new FaucetClaimRequest();
        request.setWalletAddress(walletAddress);
        request.setClientId(clientId);
        request.setAmount(amount);
        return request;
    }
}
