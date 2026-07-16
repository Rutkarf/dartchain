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
class ShowcaseChartControllerIntegrationTest {

    @Autowired
    private MockMvc mockMvc;

    @Test
    void getChart_isPublic_withDefaultRange() throws Exception {
        mockMvc.perform(get("/api/showcase/chart"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.pair").isNotEmpty())
                .andExpect(jsonPath("$.range").value("24h"))
                .andExpect(jsonPath("$.points").isArray());
    }

    @Test
    void getChart_acceptsCustomPairAndRange() throws Exception {
        mockMvc.perform(get("/api/showcase/chart")
                        .param("pair", "DART-R4V3")
                        .param("range", "7d"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.pair").value("DART-R4V3"))
                .andExpect(jsonPath("$.range").value("7d"));
    }
}
