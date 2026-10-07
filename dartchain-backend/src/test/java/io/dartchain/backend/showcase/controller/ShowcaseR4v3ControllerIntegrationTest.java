package io.dartchain.backend.showcase.controller;

import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.web.servlet.AutoConfigureMockMvc;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.test.web.servlet.MockMvc;

import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

@SpringBootTest
@AutoConfigureMockMvc
class ShowcaseR4v3ControllerIntegrationTest {

    @Autowired
    private MockMvc mockMvc;

    @Test
    void getDashboard_returnsAggregatedPayload() throws Exception {
        mockMvc.perform(get("/api/showcase/r4v3"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.panel.symbol").value("R4V3"))
                .andExpect(jsonPath("$.news.items").isArray())
                .andExpect(jsonPath("$.launchTokens").isArray())
                .andExpect(jsonPath("$.swapStats.swapNewsCount").isNumber())
                .andExpect(jsonPath("$.ratesLatencyMs").isNumber());
    }
}
