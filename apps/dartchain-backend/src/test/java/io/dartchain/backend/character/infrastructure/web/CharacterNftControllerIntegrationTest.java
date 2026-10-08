package io.dartchain.backend.character.infrastructure.web;

import io.dartchain.backend.support.MockMvcIntegrationSupport;
import io.dartchain.backend.support.MockMvcIntegrationSupport.Session;
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
class CharacterNftControllerIntegrationTest {

    @Autowired
    private MockMvc mockMvc;

    @Test
    void me_withoutAuth_isUnauthorized() throws Exception {
        mockMvc.perform(get("/api/v1/characters/me"))
                .andExpect(status().isUnauthorized());
    }

    @Test
    void me_withAuth_usesAccountId() throws Exception {
        Session session = MockMvcIntegrationSupport.register(mockMvc);

        mockMvc.perform(get("/api/v1/characters/me")
                        .header("Authorization", session.authHeader())
                        .header("X-User-Id", "someone-else"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.userId").value(session.userId()));
    }

    @Test
    void byUser_withoutAuth_isUnauthorized() throws Exception {
        mockMvc.perform(get("/api/v1/characters/demo-user"))
                .andExpect(status().isUnauthorized());
    }

    @Test
    void byUser_otherAccount_isForbidden() throws Exception {
        Session session = MockMvcIntegrationSupport.register(mockMvc);

        mockMvc.perform(get("/api/v1/characters/demo-user")
                        .header("Authorization", session.authHeader()))
                .andExpect(status().isForbidden());
    }
}
