package io.dartchain.backend.controller;

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
class CryptoRatesControllerIntegrationTest {

    @Autowired
    private MockMvc mockMvc;

    @Test
    void getNativePanel_isPublic() throws Exception {
        mockMvc.perform(get("/api/crypto-rates/panels/native"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.symbol").value("R4V3"))
                .andExpect(jsonPath("$.pair").value("R4V3 / CHF"))
                .andExpect(jsonPath("$.value").exists())
                .andExpect(jsonPath("$.points").isArray());
    }

    @Test
    void searchCoins_shortQuery_returnsEmptyArray() throws Exception {
        mockMvc.perform(get("/api/crypto-rates/search").param("q", "a"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$").isArray())
                .andExpect(jsonPath("$.length()").value(0));
    }

    @Test
    void getPanelsBatch_emptyParam_returnsEmptyArray() throws Exception {
        mockMvc.perform(get("/api/crypto-rates/panels/batch").param("coins", ""))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$").isArray())
                .andExpect(jsonPath("$.length()").value(0));
    }
}
