package io.dartchain.backend.controller;

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
class FaucetControllerIntegrationTest {

    @Autowired
    private MockMvc mockMvc;

    @Test
    void getConfig_isPublic() throws Exception {
        mockMvc.perform(get("/api/faucet/config"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.defaultClaimAmount").exists())
                .andExpect(jsonPath("$.cooldownSeconds").exists())
                .andExpect(jsonPath("$.walletPrefix").value("R4V3"))
                .andExpect(jsonPath("$.maxClaimAmount").value("1"));
    }

    @Test
    void getState_isPublic() throws Exception {
        WalletInfo wallet = MockMvcIntegrationSupport.createWallet(mockMvc);

        mockMvc.perform(get("/api/faucet/state/{walletAddress}", wallet.address()))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.walletAddress").value(wallet.address()))
                .andExpect(jsonPath("$.eligible").exists());
    }

    @Test
    void getClaims_withoutLinkedWallet_returnsEmptyList() throws Exception {
        Session session = MockMvcIntegrationSupport.register(mockMvc);

        mockMvc.perform(get("/api/faucet/claims")
                        .header("Authorization", session.authHeader()))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$").isArray())
                .andExpect(jsonPath("$").isEmpty());
    }

    @Test
    void claim_withoutAuth_isUnauthorized() throws Exception {
        WalletInfo wallet = MockMvcIntegrationSupport.createWallet(mockMvc);

        mockMvc.perform(post("/api/faucet/claim")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("""
                                {"walletAddress": "%s"}
                                """.formatted(wallet.address())))
                .andExpect(status().isUnauthorized())
                .andExpect(jsonPath("$.status").value(401));
    }

    @Test
    void claim_withAuthAndLinkedWallet_createsClaim() throws Exception {
        Session session = MockMvcIntegrationSupport.register(mockMvc);
        WalletInfo wallet = MockMvcIntegrationSupport.createWallet(mockMvc);
        MockMvcIntegrationSupport.linkWallet(mockMvc, session, wallet);

        mockMvc.perform(post("/api/faucet/claim")
                        .header("Authorization", session.authHeader())
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("""
                                {"walletAddress": "%s"}
                                """.formatted(wallet.address())))
                .andExpect(status().isCreated())
                .andExpect(jsonPath("$.walletAddress").value(wallet.address()))
                .andExpect(jsonPath("$.amount").exists());
    }
}
