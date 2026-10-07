package io.dartchain.backend.blockchain.infrastructure.web;

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
class BlockchainControllerIntegrationTest {

    @Autowired
    private MockMvc mockMvc;

    @Test
    void getChain_isPublic() throws Exception {
        mockMvc.perform(get("/api/blockchain/chain"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$").isArray())
                .andExpect(jsonPath("$[0].index").value(0));
    }

    @Test
    void isChainValid_isPublic() throws Exception {
        mockMvc.perform(get("/api/blockchain/valid"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$").value(true));
    }

    @Test
    void getBalance_isPublic() throws Exception {
        WalletInfo wallet = MockMvcIntegrationSupport.createWallet(mockMvc);

        mockMvc.perform(get("/api/blockchain/balance/{address}", wallet.address()))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.address").value(wallet.address()))
                .andExpect(jsonPath("$.balance").exists());
    }

    @Test
    void mine_withoutAuth_isUnauthorized() throws Exception {
        WalletInfo wallet = MockMvcIntegrationSupport.createWallet(mockMvc);

        mockMvc.perform(post("/api/blockchain/mine")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("""
                                {"minerAddress": "%s"}
                                """.formatted(wallet.address())))
                .andExpect(status().isUnauthorized())
                .andExpect(jsonPath("$.status").value(401));
    }

    @Test
    void mine_withAuthAndLinkedWallet_minesBlock() throws Exception {
        Session session = MockMvcIntegrationSupport.register(mockMvc);
        WalletInfo wallet = MockMvcIntegrationSupport.createWallet(mockMvc);
        MockMvcIntegrationSupport.linkWallet(mockMvc, session, wallet);

        mockMvc.perform(post("/api/blockchain/mine")
                        .header("Authorization", session.authHeader())
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("""
                                {"minerAddress": "%s"}
                                """.formatted(wallet.address())))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.index").isNumber())
                .andExpect(jsonPath("$.hash").isNotEmpty());
    }
}
