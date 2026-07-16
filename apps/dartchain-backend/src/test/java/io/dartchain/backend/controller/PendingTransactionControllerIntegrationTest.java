package io.dartchain.backend.controller;

import com.fasterxml.jackson.databind.ObjectMapper;
import io.dartchain.backend.support.MockMvcIntegrationSupport;
import io.dartchain.backend.support.MockMvcIntegrationSupport.Session;
import io.dartchain.backend.support.MockMvcIntegrationSupport.WalletInfo;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.web.servlet.AutoConfigureMockMvc;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.http.MediaType;
import org.springframework.test.web.servlet.MockMvc;

import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

@SpringBootTest
@AutoConfigureMockMvc
class PendingTransactionControllerIntegrationTest {

    private static final ObjectMapper OBJECT_MAPPER = new ObjectMapper();

    @Autowired
    private MockMvc mockMvc;

    @Test
    void getPendingTransactions_isPublic() throws Exception {
        mockMvc.perform(get("/api/pending-transactions"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$").isArray());
    }

    @Test
    void removedPendingAlias_returnsNotFound() throws Exception {
        mockMvc.perform(get("/api/transactions/pending"))
                .andExpect(status().isNotFound());
    }

    @Test
    void addPendingTransaction_withoutAuth_isUnauthorized() throws Exception {
        WalletInfo wallet = MockMvcIntegrationSupport.createWallet(mockMvc);
        WalletInfo recipient = MockMvcIntegrationSupport.createWallet(mockMvc);

        mockMvc.perform(post("/api/pending-transactions")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("""
                                {
                                  "fromAddress": "%s",
                                  "toAddress": "%s",
                                  "amount": "1.0"
                                }
                                """.formatted(wallet.address(), recipient.address())))
                .andExpect(status().isUnauthorized())
                .andExpect(jsonPath("$.status").value(401));
    }

    @Test
    void addPendingTransaction_withAuthAndLinkedWallet_createsPendingTx() throws Exception {
        Session session = MockMvcIntegrationSupport.register(mockMvc);
        WalletInfo wallet = MockMvcIntegrationSupport.createWallet(mockMvc);
        WalletInfo recipient = MockMvcIntegrationSupport.createWallet(mockMvc);
        MockMvcIntegrationSupport.linkWallet(mockMvc, session, wallet);

        mockMvc.perform(post("/api/pending-transactions")
                        .header("Authorization", session.authHeader())
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("""
                                {
                                  "fromAddress": "%s",
                                  "toAddress": "%s",
                                  "amount": "0.5",
                                  "data": "phase-l-test"
                                }
                                """.formatted(wallet.address(), recipient.address())))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.transaction.id").isNotEmpty())
                .andExpect(jsonPath("$.transaction.fromAddress").value(wallet.address()))
                .andExpect(jsonPath("$.transaction.toAddress").value(recipient.address()));
    }

    @Test
    void minePendingTransaction_withoutAuth_isUnauthorized() throws Exception {
        mockMvc.perform(post("/api/pending-transactions/pending-tx-id/mine"))
                .andExpect(status().isUnauthorized())
                .andExpect(jsonPath("$.status").value(401));
    }

    @Test
    void minePendingTransaction_withAuth_minesPendingTx() throws Exception {
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
                                  "amount": "0.25"
                                }
                                """.formatted(wallet.address(), recipient.address())))
                .andExpect(status().isOk())
                .andReturn();

        String body = createResult.getResponse().getContentAsString();
        String pendingId = OBJECT_MAPPER.readTree(body).path("transaction").path("id").asText();

        mockMvc.perform(post("/api/pending-transactions/{id}/mine", pendingId)
                        .header("Authorization", session.authHeader()))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.block.index").isNumber())
                .andExpect(jsonPath("$.block.hash").isNotEmpty());
    }
}
