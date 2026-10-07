package io.dartchain.backend.blockchain.infrastructure.web;

import io.dartchain.backend.support.MockMvcIntegrationSupport;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.web.servlet.AutoConfigureMockMvc;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.http.MediaType;
import org.springframework.test.web.servlet.MockMvc;

import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

@SpringBootTest
@AutoConfigureMockMvc
class BlockControllerIntegrationTest {

    @Autowired
    private MockMvc mockMvc;

    @Test
    void createBlock_withoutAuth_isUnauthorized() throws Exception {
        mockMvc.perform(post("/api/blocks")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("""
                                {"data": "unauthorized-block"}
                                """))
                .andExpect(status().isUnauthorized())
                .andExpect(jsonPath("$.status").value(401));
    }

    @Test
    void validateIncomingBlock_withoutAuth_isUnauthorized() throws Exception {
        mockMvc.perform(post("/api/blocks/validate")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("""
                                {
                                  "index": 1,
                                  "timestamp": 1,
                                  "data": "block",
                                  "previousHash": "0",
                                  "hash": "abc"
                                }
                                """))
                .andExpect(status().isUnauthorized())
                .andExpect(jsonPath("$.status").value(401));
    }

    @Test
    void createBlock_withAuth_isCreated() throws Exception {
        var session = MockMvcIntegrationSupport.register(mockMvc);

        mockMvc.perform(post("/api/blocks")
                        .header("Authorization", session.authHeader())
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("""
                                {"data": "secured-block"}
                                """))
                .andExpect(status().isCreated())
                .andExpect(jsonPath("$.data").value("secured-block"));
    }
}
