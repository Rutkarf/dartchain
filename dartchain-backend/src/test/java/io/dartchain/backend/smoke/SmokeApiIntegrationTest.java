package io.dartchain.backend.smoke;

import io.dartchain.backend.support.MockMvcIntegrationSupport;
import io.dartchain.backend.support.MockMvcIntegrationSupport.Session;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.web.servlet.AutoConfigureMockMvc;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.http.MediaType;
import org.springframework.test.web.servlet.MockMvc;

import static org.hamcrest.Matchers.greaterThanOrEqualTo;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

/**
 * Remplace {@code scripts/verification/smoke-api.sh} — parcours API minimal en MockMvc.
 */
@SpringBootTest
@AutoConfigureMockMvc
class SmokeApiIntegrationTest {

    @Autowired
    private MockMvc mockMvc;

    @Test
    void publicReads_registerAndLogin_succeed() throws Exception {
        mockMvc.perform(get("/api/health"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.ok").value(true))
                .andExpect(jsonPath("$.persistenceMode").value("memory"));

        mockMvc.perform(get("/api/blockchain/valid"))
                .andExpect(status().isOk());

        mockMvc.perform(get("/api/blockchain/chain"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$[0].index").exists());

        mockMvc.perform(get("/api/quests/catalog"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.dailyTasks").isArray());

        mockMvc.perform(get("/api/showcase/r4v3"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.panel").exists())
                .andExpect(jsonPath("$.launchTokens").isArray());

        mockMvc.perform(get("/api/crypto-rates/panels/native"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.symbol").value("R4V3"));

        mockMvc.perform(get("/api/peers/stats"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.networkLoadPercent").exists());

        mockMvc.perform(post("/api/faucet/claim")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{\"walletAddress\":\"smoke-wallet\"}"))
                .andExpect(status().isUnauthorized());

        Session session = MockMvcIntegrationSupport.register(mockMvc);

        mockMvc.perform(post("/api/auth/login")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("""
                                {
                                  "identifier": "%s",
                                  "password": "password123"
                                }
                                """.formatted(session.username())))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.token").isNotEmpty());

        mockMvc.perform(get("/actuator/health"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.status").value("UP"));

        mockMvc.perform(get("/api/blockchain/chain"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.length()").value(greaterThanOrEqualTo(1)));
    }
}
