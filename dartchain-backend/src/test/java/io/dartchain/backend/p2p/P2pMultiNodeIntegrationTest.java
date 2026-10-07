package io.dartchain.backend.p2p;

import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import io.dartchain.backend.support.RestApiTestSupport;
import io.dartchain.backend.support.RestApiTestSupport.WalletInfo;
import io.dartchain.backend.support.SecondaryNodeTestSupport;
import io.dartchain.backend.support.SecondaryNodeTestSupport.SecondaryNode;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.web.servlet.AutoConfigureMockMvc;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.test.web.servlet.MockMvc;

import java.util.concurrent.TimeUnit;

import static org.junit.jupiter.api.Assertions.assertTrue;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

@SpringBootTest(webEnvironment = SpringBootTest.WebEnvironment.RANDOM_PORT)
@AutoConfigureMockMvc
class P2pMultiNodeIntegrationTest {

    private static final ObjectMapper OBJECT_MAPPER = new ObjectMapper();

    @Autowired
    private MockMvc mockMvc;

    @Test
    void nodeASyncsChainAfterMiningOnNodeB() throws Exception {
        try (SecondaryNode nodeB = SecondaryNodeTestSupport.start()) {
            RestApiTestSupport.Session sessionB = RestApiTestSupport.register(nodeB.baseUrl());
            WalletInfo walletB = RestApiTestSupport.createWallet(nodeB.baseUrl());
            RestApiTestSupport.linkWallet(nodeB.baseUrl(), sessionB, walletB);
            RestApiTestSupport.mineBlock(nodeB.baseUrl(), sessionB, walletB.address());

            int chainLengthB = RestApiTestSupport.chainLength(nodeB.baseUrl());
            assertTrue(chainLengthB >= 2);

            RestApiTestSupport.Session sessionA = RestApiTestSupport.registerWithWallet(mockMvc);
            RestApiTestSupport.addPeer(mockMvc, sessionA, nodeB.peerWebSocketUrl());
            RestApiTestSupport.reconnectPeer(mockMvc, sessionA, nodeB.peerWebSocketUrl());

            assertTrue(waitForChainLength(mockMvc, chainLengthB, 45_000));
        }
    }

    @Test
    void nodeAExposesMeasuredMetricsAfterConnectingToNodeB() throws Exception {
        try (SecondaryNode nodeB = SecondaryNodeTestSupport.start()) {
            RestApiTestSupport.Session sessionA = RestApiTestSupport.registerWithWallet(mockMvc);
            RestApiTestSupport.addPeer(mockMvc, sessionA, nodeB.peerWebSocketUrl());

            assertTrue(waitForPeerMetrics(mockMvc, 15_000));
        }
    }

    private boolean waitForPeerMetrics(MockMvc mockMvc, long timeoutMs) throws Exception {
        long deadline = System.currentTimeMillis() + timeoutMs;
        while (System.currentTimeMillis() < deadline) {
            var result = mockMvc.perform(get("/api/peers"))
                    .andExpect(status().isOk())
                    .andReturn();
            JsonNode peers = OBJECT_MAPPER.readTree(result.getResponse().getContentAsString());
            if (peers.isArray() && !peers.isEmpty()) {
                JsonNode peer = peers.get(0);
                if (peer.hasNonNull("syncPercent") && peer.has("latencyMs")) {
                    return true;
                }
            }
            TimeUnit.MILLISECONDS.sleep(500);
        }
        return false;
    }

    private boolean waitForChainLength(MockMvc mockMvc, int expected, long timeoutMs) throws Exception {
        long deadline = System.currentTimeMillis() + timeoutMs;
        while (System.currentTimeMillis() < deadline) {
            if (RestApiTestSupport.chainLength(mockMvc) >= expected) {
                return true;
            }
            TimeUnit.MILLISECONDS.sleep(500);
        }
        return RestApiTestSupport.chainLength(mockMvc) >= expected;
    }
}
