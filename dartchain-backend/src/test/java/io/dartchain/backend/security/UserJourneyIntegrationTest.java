package io.dartchain.backend.security;

import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import io.dartchain.backend.faucet.store.FaucetPendingBalanceStore;
import io.dartchain.backend.support.MockMvcIntegrationSupport;
import io.dartchain.backend.support.MockMvcIntegrationSupport.Session;
import io.dartchain.backend.support.MockMvcIntegrationSupport.WalletInfo;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.web.servlet.AutoConfigureMockMvc;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.http.MediaType;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.test.web.servlet.MvcResult;

import static org.assertj.core.api.Assertions.assertThat;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

/**
 * Phase O — parcours utilisateur critique (équivalent API du scénario Playwright E2E).
 */
@SpringBootTest
@AutoConfigureMockMvc
class UserJourneyIntegrationTest {

    private static final ObjectMapper OBJECT_MAPPER = new ObjectMapper();

    @Autowired
    private MockMvc mockMvc;

    @Autowired
    private FaucetPendingBalanceStore pendingBalanceStore;

    @Test
    void registerWalletFaucetMineQuestExploreBlock_succeeds() throws Exception {
        Session session = MockMvcIntegrationSupport.register(mockMvc);
        WalletInfo wallet = MockMvcIntegrationSupport.createWallet(mockMvc);
        MockMvcIntegrationSupport.linkWallet(mockMvc, session, wallet);
        MockMvcIntegrationSupport.seedFaucetPending(
                pendingBalanceStore,
                wallet.address(),
                MockMvcIntegrationSupport.FAUCET_ITEST_PENDING);

        mockMvc.perform(post("/api/faucet/claim")
                        .header("Authorization", session.authHeader())
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("""
                                {"walletAddress": "%s"}
                                """.formatted(wallet.address())))
                .andExpect(status().isCreated())
                .andExpect(jsonPath("$.walletAddress").value(wallet.address()));

        MvcResult mineResult = mockMvc.perform(post("/api/blockchain/mine")
                        .header("Authorization", session.authHeader())
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("""
                                {"minerAddress": "%s"}
                                """.formatted(wallet.address())))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.index").isNumber())
                .andReturn();

        JsonNode minedBlock = OBJECT_MAPPER.readTree(mineResult.getResponse().getContentAsString());
        int minedIndex = minedBlock.path("index").asInt();
        assertThat(minedIndex).isGreaterThanOrEqualTo(1);

        mockMvc.perform(post("/api/quests/explore-block")
                        .header("Authorization", session.authHeader())
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("""
                                {"blockIndex": %d}
                                """.formatted(minedIndex)))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.tasks['explore-blocks'].progress").value(1));
    }
}
