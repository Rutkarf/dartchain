package io.dartchain.backend.api;

import io.dartchain.backend.config.ApiRoutes;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.web.servlet.AutoConfigureMockMvc;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.http.MediaType;
import org.springframework.test.web.servlet.MockMvc;

import static org.hamcrest.Matchers.containsString;
import static org.hamcrest.Matchers.greaterThanOrEqualTo;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.header;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

@SpringBootTest
@AutoConfigureMockMvc
class ApiV1ContractIntegrationTest {

    @Autowired
    private MockMvc mockMvc;

    @Test
    void contract_listsV1Endpoints() throws Exception {
        mockMvc.perform(get(ApiRoutes.CONTRACT_V1))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.apiVersion").value("v1"))
                .andExpect(jsonPath("$.errorFormat").value("application/problem+json"))
                .andExpect(jsonPath("$.endpoints[?(@.path=='/api/v1/health')]").exists())
                .andExpect(jsonPath("$.endpoints[?(@.path=='/api/v1/blockchain/stats')]").exists())
                .andExpect(jsonPath("$.endpoints.length()").value(greaterThanOrEqualTo(10)));
    }

    @Test
    void blockchainStatsV1_returnsStats() throws Exception {
        mockMvc.perform(get(ApiRoutes.BLOCKCHAIN_STATS_V1))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.totalBlocks").exists());
    }

    @Test
    void removedLegacyStats_returnsNotFound() throws Exception {
        mockMvc.perform(get("/api/stats"))
                .andExpect(status().isNotFound());
    }

    @Test
    void v1ValidationErrors_useProblemJson() throws Exception {
        mockMvc.perform(post(ApiRoutes.AUTH_LOGIN_V1)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{}"))
                .andExpect(status().isBadRequest())
                .andExpect(header().string("Content-Type", containsString("application/problem+json")))
                .andExpect(jsonPath("$.status").value(400))
                .andExpect(jsonPath("$.title").value("Bad Request"))
                .andExpect(jsonPath("$.detail").exists());
    }

    @Test
    void v1Unauthorized_usesProblemJson() throws Exception {
        mockMvc.perform(get(ApiRoutes.AUTH_ME_V1))
                .andExpect(status().isUnauthorized())
                .andExpect(header().string("Content-Type", containsString("application/problem+json")))
                .andExpect(jsonPath("$.status").value(401));
    }

    @Test
    void legacyUnauthorized_keepsApiErrorShape() throws Exception {
        mockMvc.perform(post("/api/transactions")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("""
                                {
                                  "senderAddress": "x",
                                  "recipientAddress": "y",
                                  "amount": "1"
                                }
                                """))
                .andExpect(status().isUnauthorized())
                .andExpect(jsonPath("$.status").value(401))
                .andExpect(jsonPath("$.message").exists());
    }

    @Test
    void v1Register_createsAccount() throws Exception {
        String suffix = String.valueOf(System.currentTimeMillis());
        mockMvc.perform(post(ApiRoutes.AUTH_REGISTER_V1)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("""
                                {
                                  "username": "v1%s",
                                  "email": "v1%s@dartchain.dev",
                                  "password": "password123"
                                }
                                """.formatted(suffix, suffix)))
                .andExpect(status().isCreated())
                .andExpect(jsonPath("$.token").isNotEmpty());
    }
}
