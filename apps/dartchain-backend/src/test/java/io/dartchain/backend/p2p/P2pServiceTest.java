package io.dartchain.backend.p2p;

import com.fasterxml.jackson.databind.ObjectMapper;
import io.dartchain.backend.auth.UserAccount;
import io.dartchain.backend.auth.security.AuthenticatedUser;
import io.dartchain.backend.auth.security.WebSocketAuthSupport;
import io.dartchain.backend.blockchain.model.Block;
import io.dartchain.backend.peer.PeerMetricsRegistry;
import io.dartchain.backend.quests.application.QuestService;
import io.dartchain.backend.blockchain.application.BlockchainService;
import io.dartchain.backend.blockchain.application.PendingTransactionService;
import io.dartchain.backend.blockchain.application.TransactionPoolService;
import io.dartchain.backend.support.InMemoryWebSocketSession;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.web.socket.WebSocketSession;

import java.util.List;
import java.util.Optional;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertNotNull;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.argThat;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

@ExtendWith(MockitoExtension.class)
class P2pServiceTest {

    @Mock
    private BlockchainService blockchainService;

    @Mock
    private PendingTransactionService pendingTransactionService;

    @Mock
    private TransactionPoolService transactionPoolService;

    @Mock
    private P2pSessionRegistry sessionRegistry;

    @Mock
    private WebSocketAuthSupport webSocketAuthSupport;

    @Mock
    private QuestService questService;

    private final ObjectMapper objectMapper = new ObjectMapper();
    private PeerMetricsRegistry metricsRegistry;
    private P2pService p2pService;

    @BeforeEach
    void setUp() {
        metricsRegistry = new PeerMetricsRegistry();
        p2pService = new P2pService(
                objectMapper,
                blockchainService,
                pendingTransactionService,
                transactionPoolService,
                sessionRegistry,
                webSocketAuthSupport,
                metricsRegistry,
                questService
        );
    }

    @Test
    void queryMessages_areBuiltWithExpectedTypes() {
        assertEquals(P2pMessageType.QUERY_LATEST, p2pService.queryChainLengthMsg().getType());
        assertEquals(P2pMessageType.QUERY_ALL, p2pService.queryAllMsg().getType());
        assertEquals(P2pMessageType.QUERY_TRANSACTION_POOL, p2pService.queryTransactionPoolMsg().getType());
    }

    @Test
    void onMessage_ignoresAuthenticatedResponsesWithoutSessionAuth() throws Exception {
        Block genesis = genesisBlock();

        WebSocketSession session = new InMemoryWebSocketSession("unauthenticated-peer");
        when(webSocketAuthSupport.resolveFromSession(session)).thenReturn(Optional.empty());

        String payload = objectMapper.writeValueAsString(
                new P2pMessage(
                        P2pMessageType.RESPONSE_BLOCKCHAIN,
                        objectMapper.writeValueAsString(List.of(genesis))
                )
        );

        p2pService.onMessage(session, payload);

        verify(blockchainService, never()).addBlockFromPeer(any());
        verify(blockchainService, never()).replaceChainFromPeer(any());
    }

    @Test
    void onMessage_recordsChainSyncMetricsForAuthenticatedSession() throws Exception {
        Block genesis = genesisBlock();
        Block remote = new Block();
        remote.setIndex(1);
        remote.setHash("block-1-hash");
        remote.setPreviousHash("genesis-hash");

        when(blockchainService.getLatestBlock()).thenReturn(genesis);
        when(blockchainService.getBlocks()).thenReturn(List.of(genesis));
        when(blockchainService.addBlockFromPeer(any())).thenReturn(true);

        WebSocketSession session = new InMemoryWebSocketSession("auth-peer");
        metricsRegistry.bindSession(session, "ws://127.0.0.1:8080/ws/peers");
        when(webSocketAuthSupport.resolveFromSession(session))
                .thenReturn(Optional.of(new AuthenticatedUser(sampleAccount())));

        String payload = objectMapper.writeValueAsString(
                new P2pMessage(
                        P2pMessageType.RESPONSE_BLOCKCHAIN,
                        objectMapper.writeValueAsString(List.of(remote))
                )
        );

        p2pService.onMessage(session, payload);

        verify(blockchainService).addBlockFromPeer(argThat(block ->
                block.getIndex() == 1 && "block-1-hash".equals(block.getHash())
        ));
        assertNotNull(metricsRegistry.getSnapshot("ws://127.0.0.1:8080/ws/peers").lastSyncAt());
    }

    private static Block genesisBlock() {
        Block genesis = new Block();
        genesis.setIndex(0);
        genesis.setHash("genesis-hash");
        genesis.setPreviousHash("0");
        return genesis;
    }

    private static UserAccount sampleAccount() {
        UserAccount account = new UserAccount();
        account.setId("user-1");
        account.setUsername("alice");
        account.setEmail("alice@dartchain.dev");
        account.setWalletAddress("wallet-a");
        account.setWalletPublicKey("public-key");
        return account;
    }
}
