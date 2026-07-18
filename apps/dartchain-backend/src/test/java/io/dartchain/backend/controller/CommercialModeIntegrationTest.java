package io.dartchain.backend.controller;

import io.dartchain.backend.support.MockMvcIntegrationSupport;
import io.dartchain.backend.support.MockMvcIntegrationSupport.Session;
import io.dartchain.backend.support.MockMvcIntegrationSupport.WalletInfo;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.web.servlet.AutoConfigureMockMvc;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.http.MediaType;
import org.springframework.test.context.TestPropertySource;
import org.springframework.test.web.servlet.MockMvc;

import static org.hamcrest.Matchers.containsString;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

@SpringBootTest
@AutoConfigureMockMvc
@TestPropertySource(properties = {
        "dartchain.product.commercial=false",
        "dartchain.product.allow-legacy-private-key=false",
        "dartchain.product.allow-server-wallet-create=false"
})
class CommercialModeIntegrationTest {

    @Autowired
    private MockMvc mockMvc;

    @Test
    void healthV1_exposesProductFlags() throws Exception {
        mockMvc.perform(get("/api/v1/health"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.ok").value(true))
                .andExpect(jsonPath("$.commercial").value(false))
                .andExpect(jsonPath("$.features.faucet").value(true))
                .andExpect(jsonPath("$.features.legacyPrivateKey").value(false));
    }

    @Test
    void createTransaction_withLegacyPrivateKey_isForbidden() throws Exception {
        Session session = MockMvcIntegrationSupport.register(mockMvc);
        WalletInfo wallet = MockMvcIntegrationSupport.createLocalWallet();
        WalletInfo recipient = MockMvcIntegrationSupport.createLocalWallet();
        MockMvcIntegrationSupport.linkWallet(mockMvc, session, wallet);

        mockMvc.perform(post("/api/transactions")
                        .header("Authorization", session.authHeader())
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("""
                                {
                                  "senderAddress": "%s",
                                  "senderPublicKey": "%s",
                                  "senderPrivateKey": "%s",
                                  "recipientAddress": "%s",
                                  "amount": "0.1"
                                }
                                """.formatted(
                                wallet.address(),
                                wallet.publicKey(),
                                wallet.privateKey(),
                                recipient.address())))
                .andExpect(status().isForbidden())
                .andExpect(jsonPath("$.status").value(403))
                .andExpect(jsonPath("$.message", containsString("senderPrivateKey")));
    }

    @Test
    void faucetConfig_isAccessible() throws Exception {
        mockMvc.perform(get("/api/faucet/config"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.defaultClaimAmount").exists());
    }

    @Test
    void removedServerWalletCreate_returnsNotFound() throws Exception {
        mockMvc.perform(post("/api/wallets/create"))
                .andExpect(status().isNotFound());
    }
}
