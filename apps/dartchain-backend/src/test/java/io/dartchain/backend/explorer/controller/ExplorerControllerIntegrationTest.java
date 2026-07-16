package io.dartchain.backend.explorer.controller;

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
class ExplorerControllerIntegrationTest {

    @Autowired
    private MockMvc mockMvc;

    @Test
    void searchGenesisBlock_isPublic() throws Exception {
        mockMvc.perform(get("/api/explorer/search").param("q", "0"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.query").value("0"))
                .andExpect(jsonPath("$.results").isArray())
                .andExpect(jsonPath("$.results[0].kind").value("BLOCK"))
                .andExpect(jsonPath("$.results[0].blockIndex").value(0));
    }

    @Test
    void searchBlankQuery_returnsEmptyResults() throws Exception {
        mockMvc.perform(get("/api/explorer/search").param("q", "   "))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.results").isEmpty());
    }

    @Test
    void filterBlocks_byHeightRange_isPublic() throws Exception {
        mockMvc.perform(get("/api/explorer/blocks").param("from", "0").param("to", "0"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.total").value(1))
                .andExpect(jsonPath("$.blocks[0].index").value(0));
    }
}
