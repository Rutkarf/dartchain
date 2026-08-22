package io.dartchain.backend.quests;

import com.fasterxml.jackson.databind.ObjectMapper;
import io.dartchain.backend.auth.AuthService;
import io.dartchain.backend.auth.JsonUserAccountStore;
import io.dartchain.backend.auth.dto.LinkWalletRequest;
import io.dartchain.backend.auth.dto.LoginRequest;
import io.dartchain.backend.auth.dto.RegisterRequest;
import io.dartchain.backend.blockchain.JsonBlockchainStateStore;
import io.dartchain.backend.quests.dto.QuestProgressRequest;
import io.dartchain.backend.blockchain.application.BlockchainService;
import io.dartchain.backend.blockchain.application.BlockchainValidationService;
import io.dartchain.backend.service.TransactionPoolService;
import io.dartchain.backend.showcase.application.MarketChartService;
import io.dartchain.backend.support.AuthServiceTestSupport;
import io.dartchain.backend.support.BlockchainTestSupport;
import io.dartchain.backend.shared.utils.CryptoUtils;
import io.dartchain.backend.quests.model.QuestProgressState;
import io.dartchain.backend.quests.model.QuestTaskState;
import org.springframework.context.ApplicationEventPublisher;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.io.TempDir;

import java.nio.file.Path;
import java.math.BigDecimal;
import java.security.KeyPair;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.Mockito.mock;

class QuestServiceTest {

    @TempDir
    Path tempDir;

    private AuthService authService;
    private BlockchainService blockchainService;
    private QuestService questService;
    private JsonQuestProgressStore questStore;
    private String authHeader;
    private String walletAddress;
    private String userId;

    @BeforeEach
    void setUp() throws Exception {
        JsonUserAccountStore userStore = new JsonUserAccountStore(
                new ObjectMapper(),
                tempDir.resolve("auth-users.json").toString()
        );
        userStore.loadFromDisk();

        questStore = new JsonQuestProgressStore(
                new ObjectMapper(),
                tempDir.resolve("quest-progress.json").toString()
        );
        questStore.loadFromDisk();

        var blockchainStore = new JsonBlockchainStateStore(
                new ObjectMapper(),
                tempDir.resolve("blockchain-state.json").toString()
        );
        blockchainStore.loadFromDisk();
        MarketChartService marketChartService = mock(MarketChartService.class);
        TransactionPoolService transactionPoolService = BlockchainTestSupport.newTransactionPool(blockchainStore);
        blockchainService = BlockchainTestSupport.newBlockchainService(
                blockchainStore,
                new BlockchainValidationService(),
                marketChartService,
                transactionPoolService
        );

        authService = AuthServiceTestSupport.createJsonAuthService(userStore);
        ApplicationEventPublisher eventPublisher = mock(ApplicationEventPublisher.class);
        questService = new QuestService(authService, questStore, blockchainService, eventPublisher);
        authService = AuthServiceTestSupport.createJsonAuthService(userStore, questService);

        authService.register(
                new RegisterRequest("alice", "alice@dartchain.dev", "password123"),
                AuthServiceTestSupport.LOCAL_IP
        );
        var login = authService.login(new LoginRequest("alice", "password123"), AuthServiceTestSupport.LOCAL_IP);
        authHeader = "Bearer " + login.token();
        userId = login.user().id();

        KeyPair keyPair = CryptoUtils.generateKeyPair();
        walletAddress = CryptoUtils.addressFromPublicKey(keyPair.getPublic());
        authService.linkWallet(
                authHeader,
                new LinkWalletRequest(
                        walletAddress,
                        CryptoUtils.publicKeyToBase64(keyPair.getPublic())
                )
        );
    }

    @Test
    void authRegistrationRecordsDailyLoginQuest() {
        var state = questService.getState(authHeader);

        assertThat(state.tasks().get("daily-login").progress()).isEqualTo(1);
    }

    @Test
    void rejectsClientReportedProgressForServerHookedTasks() {
        assertThatThrownBy(() -> questService.recordProgress(
                authHeader,
                new QuestProgressRequest("daily-login", 1)
        ))
                .isInstanceOf(QuestException.class)
                .extracting("statusCode")
                .isEqualTo(403);

        assertThatThrownBy(() -> questService.recordProgress(
                authHeader,
                new QuestProgressRequest("faucet-claim", 1)
        ))
                .isInstanceOf(QuestException.class)
                .extracting("statusCode")
                .isEqualTo(403);

        assertThatThrownBy(() -> questService.recordProgress(
                authHeader,
                new QuestProgressRequest("swap-tokens", 1)
        ))
                .isInstanceOf(QuestException.class)
                .extracting("statusCode")
                .isEqualTo(403);

        assertThatThrownBy(() -> questService.recordProgress(
                authHeader,
                new QuestProgressRequest("explore-blocks", 1)
        ))
                .isInstanceOf(QuestException.class)
                .extracting("statusCode")
                .isEqualTo(403);
    }

    @Test
    void faucetQuestCompletionDoesNotDoubleMint() {
        BigDecimal balanceBefore = blockchainService.getBalance(walletAddress);

        questService.completeFaucetClaimQuest(userId);

        var state = questService.getState(authHeader);
        assertThat(state.tasks().get("faucet-claim").progress()).isEqualTo(1);
        assertThat(state.tasks().get("faucet-claim").claimed()).isTrue();
        assertThat(blockchainService.getBalance(walletAddress)).isEqualByComparingTo(balanceBefore);
    }

    @Test
    void flushPendingAutoClaimsMintsDailyLoginAfterWalletLink() throws Exception {
        authService.register(
                new RegisterRequest("bob", "bob@dartchain.dev", "password123"),
                AuthServiceTestSupport.LOCAL_IP
        );
        var login = authService.login(
                new LoginRequest("bob", "password123"),
                AuthServiceTestSupport.LOCAL_IP
        );
        String bobAuth = "Bearer " + login.token();

        var stateBefore = questService.getState(bobAuth);
        assertThat(stateBefore.tasks().get("daily-login").progress()).isEqualTo(1);
        assertThat(stateBefore.tasks().get("daily-login").claimed()).isFalse();

        KeyPair keyPair = CryptoUtils.generateKeyPair();
        String bobWallet = CryptoUtils.addressFromPublicKey(keyPair.getPublic());
        authService.linkWallet(
                bobAuth,
                new LinkWalletRequest(
                        bobWallet,
                        CryptoUtils.publicKeyToBase64(keyPair.getPublic())
                )
        );

        var stateAfter = questService.getState(bobAuth);
        assertThat(stateAfter.tasks().get("daily-login").claimed()).isTrue();
        assertThat(blockchainService.getBalance(bobWallet)).isEqualByComparingTo("1.00");
    }

    @Test
    void serverHookAutoClaimsFaucetQuestReward() {
        BigDecimal balanceBefore = blockchainService.getBalance(walletAddress);

        questService.recordProgressForUserId(userId, "faucet-claim", 1);

        var state = questService.getState(authHeader);
        assertThat(state.tasks().get("faucet-claim").progress()).isEqualTo(1);
        assertThat(state.tasks().get("faucet-claim").claimed()).isTrue();
        assertThat(blockchainService.getBalance(walletAddress))
                .isEqualByComparingTo(balanceBefore.add(new BigDecimal("1.00")));
    }

    @Test
    void serverHookPersistsSwapProgressAcrossReload() {
        questService.recordProgressForUserId(userId, "swap-tokens", 1);

        JsonQuestProgressStore reloadedStore = new JsonQuestProgressStore(
                new ObjectMapper(),
                tempDir.resolve("quest-progress.json").toString()
        );
        reloadedStore.loadFromDisk();
        ApplicationEventPublisher eventPublisher = mock(ApplicationEventPublisher.class);
        QuestService reloadedService = new QuestService(authService, reloadedStore, blockchainService, eventPublisher);

        var state = reloadedService.getState(authHeader);

        assertThat(state.tasks().get("swap-tokens").progress()).isEqualTo(1);
    }

    @Test
    void exploreBlockRecordsQuestProgressWhenBlockExists() {
        blockchainService.addBlock("Quest explore block");

        var state = questService.recordBlockExplored(authHeader, 1);

        assertThat(state.tasks().get("explore-blocks").progress()).isEqualTo(1);
    }

    @Test
    void exploreBlockIgnoresDuplicateBlockIndex() {
        blockchainService.addBlock("Quest explore block");

        questService.recordBlockExplored(authHeader, 1);
        var state = questService.recordBlockExplored(authHeader, 1);

        assertThat(state.tasks().get("explore-blocks").progress()).isEqualTo(1);
        assertThat(state.exploredBlockIndices()).containsExactly(1);
    }

    @Test
    void getStateReturnsExploredBlockIndices() {
        blockchainService.addBlock("Quest explore block");
        questService.recordBlockExplored(authHeader, 1);

        var state = questService.getState(authHeader);

        assertThat(state.exploredBlockIndices()).containsExactly(1);
    }

    @Test
    void exploreBlockRejectsUnknownBlockIndex() {
        assertThatThrownBy(() -> questService.recordBlockExplored(authHeader, 999))
                .isInstanceOf(QuestException.class)
                .extracting("statusCode")
                .isEqualTo(404);
    }

    @Test
    void syncQuestProgressForWallet_mergesMaxProgressAndClaimed() {
        QuestProgressState local = questStore.findByUserId(userId).orElseThrow();

        // Local : swap-tokens partiel (non claim)
        local.getTasks().put("swap-tokens", new QuestTaskState(3, false));
        questStore.save(userId, local);

        QuestProgressState incoming = new QuestProgressState();
        incoming.setDayKey(local.getDayKey());
        incoming.setWeekKey(local.getWeekKey());
        incoming.setTotalXp(local.getTotalXp());
        incoming.setPendingMts(local.getPendingMts());
        incoming.setMissionClaimed(local.isMissionClaimed());
        incoming.setWeeklyClaimed(local.isWeeklyClaimed());
        incoming.setExploredBlockIndices(local.getExploredBlockIndices());
        incoming.setTasks(java.util.Map.of("swap-tokens", new QuestTaskState(10, true)));

        questService.syncQuestProgressForWallet(walletAddress, incoming);

        var state = questService.getState(authHeader);
        assertThat(state.tasks().get("swap-tokens").progress()).isEqualTo(10);
        assertThat(state.tasks().get("swap-tokens").claimed()).isTrue();
    }

    @Test
    void rejectsClaimWhenQuestIncomplete() {
        assertThatThrownBy(() -> questService.claimTask(authHeader, "swap-tokens"))
                .isInstanceOf(QuestException.class)
                .extracting("statusCode")
                .isEqualTo(400);
    }
}
