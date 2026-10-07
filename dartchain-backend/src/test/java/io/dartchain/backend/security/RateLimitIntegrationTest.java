package io.dartchain.backend.security;

import io.dartchain.backend.support.MockMvcIntegrationSupport;
import io.dartchain.backend.support.MockMvcIntegrationSupport.WalletInfo;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.web.servlet.AutoConfigureMockMvc;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.http.MediaType;
import org.springframework.test.context.TestPropertySource;
import org.springframework.test.web.servlet.MockMvc;

import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

@SpringBootTest
@AutoConfigureMockMvc
@TestPropertySource(properties = {
        "dartchain.rate-limit.max-requests=2",
        "dartchain.rate-limit.window-ms=60000"
})
class RateLimitIntegrationTest {

    @Autowired
    private MockMvc mockMvc;

    @Test
    void walletVerify_returnsTooManyRequestsAfterThreshold() throws Exception {
        WalletInfo wallet = MockMvcIntegrationSupport.createWallet(mockMvc);
        String body = """
                {
                  "address": "%s",
                  "publicKey": "%s"
                }
                """.formatted(wallet.address(), wallet.publicKey());

        for (int attempt = 0; attempt < 2; attempt++) {
            mockMvc.perform(post("/api/wallets/verify")
                            .contentType(MediaType.APPLICATION_JSON)
                            .content(body))
                    .andExpect(status().isOk());
        }

        mockMvc.perform(post("/api/wallets/verify")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(body))
                .andExpect(status().isTooManyRequests())
                .andExpect(jsonPath("$.status").value(429))
                .andExpect(jsonPath("$.message").value("Trop de requêtes. Réessayez dans une minute."));
    }
}
