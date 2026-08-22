package io.dartchain.backend.p2p;

import com.fasterxml.jackson.databind.ObjectMapper;
import io.dartchain.backend.auth.security.AuthenticatedUser;
import io.dartchain.backend.auth.store.UserAccountStore;
import io.dartchain.backend.model.Block;
import io.dartchain.backend.model.PendingTransaction;
import io.dartchain.backend.peer.PeerMetricsRegistry;
import io.dartchain.backend.blockchain.application.BlockchainService;
import io.dartchain.backend.service.PendingTransactionService;
import io.dartchain.backend.support.InMemoryWebSocketSession;
import io.dartchain.backend.support.MockMvcIntegrationSupport;
import io.dartchain.backend.support.MockMvcIntegrationSupport.Session;
import io.dartchain.backend.support.MockMvcIntegrationSupport.WalletInfo;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.web.servlet.AutoConfigureMockMvc;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.http.MediaType;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.web.socket.TextMessage;
import org.springframework.web.socket.WebSocketSession;
import org.springframework.web.socket.client.standard.StandardWebSocketClient;
import org.springframework.web.socket.handler.TextWebSocketHandler;

import java.net.URI;
import java.util.ArrayList;
import java.util.List;
import java.util.concurrent.CopyOnWriteArrayList;
import java.util.concurrent.CountDownLatch;
import java.util.concurrent.TimeUnit;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertTrue;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

@SpringBootTest(webEnvironment = SpringBootTest.WebEnvironment.RANDOM_PORT)
@AutoConfigureMockMvc
class P2pWebSocketIntegrationTest {

    @Autowired
    private MockMvc mockMvc;

    @Autowired
    private ObjectMapper objectMapper;

    @Autowired
    private P2pService p2pService;

    @Autowired
    private BlockchainService blockchainService;

    @Autowired
    private PendingTransactionService pendingTransactionService;

    @Autowired
    private PeerMetricsRegistry metricsRegistry;

    @Autowired
    private UserAccountStore userAccountStore;

    @org.springframework.boot.test.web.server.LocalServerPort
    private int port;

    @Test
    void inboundPeerReceivesChainAndPoolQueriesOnConnect() throws Exception {
        CountDownLatch latch = new CountDownLatch(2);
        List<String> payloads = new CopyOnWriteArrayList<>();

        StandardWebSocketClient client = new StandardWebSocketClient();
        WebSocketSession session = client.execute(
                new TextWebSocketHandler() {
                    @Override
                    protected void handleTextMessage(WebSocketSession session, TextMessage message) {
                        payloads.add(message.getPayload());
                        latch.countDown();
                    }
                },
                null,
                URI.create("ws://127.0.0.1:" + port + "/ws/peers")
        ).get(10, TimeUnit.SECONDS);

        try {
            assertTrue(latch.await(10, TimeUnit.SECONDS));
            assertEquals(2, payloads.size());

            List<String> types = new ArrayList<>();
            for (String payload : payloads) {
                types.add(objectMapper.readTree(payload).path("type").asText());
            }

            assertTrue(types.contains("QUERY_LATEST"));
            assertTrue(types.contains("QUERY_TRANSACTION_POOL"));
        } finally {
            session.close();
        }
    }

    @Test
    void authenticatedPeerResponse_recordsSyncMetricsWhenAlreadySynced() throws Exception {
        Session session = MockMvcIntegrationSupport.registerWithWallet(mockMvc);
        WalletInfo wallet = MockMvcIntegrationSupport.createWallet(mockMvc);
        MockMvcIntegrationSupport.linkWallet(mockMvc, session, wallet);

        mockMvc.perform(post("/api/blockchain/mine")
                        .header("Authorization", session.authHeader())
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("""
                                {"minerAddress": "%s"}
                                """.formatted(wallet.address())))
                .andExpect(status().isOk());

        Block latest = blockchainService.getLatestBlock();
        String peerKey = "phase-u-sync-peer";
        InMemoryWebSocketSession wsSession = authenticatedSession(session, peerKey);

        String payload = objectMapper.writeValueAsString(
                new P2pMessage(
                        P2pMessageType.RESPONSE_BLOCKCHAIN,
                        objectMapper.writeValueAsString(List.of(latest))
                )
        );

        p2pService.onMessage(wsSession, payload);

        assertEquals(100, metricsRegistry.getSnapshot(peerKey).syncPercent());
        assertTrue(metricsRegistry.getSnapshot(peerKey).lastSyncAt() != null);
    }

    @Test
    void authenticatedPeerResponse_syncsPendingTransaction() throws Exception {
        Session session = MockMvcIntegrationSupport.register(mockMvc);
        WalletInfo wallet = MockMvcIntegrationSupport.createWallet(mockMvc);
        WalletInfo recipient = MockMvcIntegrationSupport.createWallet(mockMvc);
        MockMvcIntegrationSupport.linkWallet(mockMvc, session, wallet);

        var createResult = mockMvc.perform(post("/api/pending-transactions")
                        .header("Authorization", session.authHeader())
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("""
                                {
                                  "fromAddress": "%s",
                                  "toAddress": "%s",
                                  "amount": "0.5",
                                  "data": "phase-u-p2p"
                                }
                                """.formatted(wallet.address(), recipient.address())))
                .andExpect(status().isOk())
                .andReturn();

        PendingTransaction pending = objectMapper.readValue(
                objectMapper.readTree(createResult.getResponse().getContentAsString()).path("transaction").toString(),
                PendingTransaction.class
        );

        int before = pendingTransactionService.getAll().size();
        String peerKey = "phase-u-mempool-peer";
        InMemoryWebSocketSession wsSession = authenticatedSession(session, peerKey);

        String payload = objectMapper.writeValueAsString(
                new P2pMessage(
                        P2pMessageType.RESPONSE_TRANSACTION_POOL,
                        objectMapper.writeValueAsString(List.of(pending))
                )
        );

        p2pService.onMessage(wsSession, payload);

        assertTrue(pendingTransactionService.getAll().size() >= before);
    }

    private InMemoryWebSocketSession authenticatedSession(Session session, String peerKey) {
        AuthenticatedUser authUser = new AuthenticatedUser(
                userAccountStore.findById(session.userId()).orElseThrow()
        );
        InMemoryWebSocketSession wsSession = new InMemoryWebSocketSession(peerKey);
        wsSession.getAttributes().put(io.dartchain.backend.auth.security.WebSocketAuthSupport.AUTH_USER_ATTRIBUTE, authUser);
        metricsRegistry.bindSession(wsSession, peerKey);
        return wsSession;
    }
}
