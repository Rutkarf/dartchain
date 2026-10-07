package io.dartchain.backend.exchange.infrastructure.web;

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
class ExchangeControllerIntegrationTest {

    @Autowired
    private MockMvc mockMvc;

    @Test
    void getPanel_isPublic() throws Exception {
        mockMvc.perform(get("/api/exchange-panel"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.availableTokens").isArray())
                .andExpect(jsonPath("$.fromToken").exists());
    }

    @Test
    void swap_withoutAuth_isUnauthorized() throws Exception {
        WalletInfo wallet = MockMvcIntegrationSupport.createWallet(mockMvc);

        mockMvc.perform(post("/api/exchange-panel/swap")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("""
                                {
                                  "fromToken": "R4V3",
                                  "toToken": "DART",
                                  "amount": 0.001,
                                  "walletAddress": "%s"
                                }
                                """.formatted(wallet.address())))
                .andExpect(status().isUnauthorized())
                .andExpect(jsonPath("$.status").value(401));
    }

    @Test
    void swap_withAuth_reachesBusinessValidation() throws Exception {
        Session session = MockMvcIntegrationSupport.register(mockMvc);
        WalletInfo wallet = MockMvcIntegrationSupport.createWallet(mockMvc);
        MockMvcIntegrationSupport.linkWallet(mockMvc, session, wallet);

        mockMvc.perform(post("/api/exchange-panel/swap")
                        .header("Authorization", session.authHeader())
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("""
                                {
                                  "fromToken": "R4V3",
                                  "toToken": "PXD",
                                  "amount": 999999999,
                                  "walletAddress": "%s"
                                }
                                """.formatted(wallet.address())))
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.message").value("Insufficient balance"));
    }
}
