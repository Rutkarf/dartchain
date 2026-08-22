package io.dartchain.backend.character.infrastructure.web;

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
    void me_withoutAuth_returnsGuestCharacter() throws Exception {
        mockMvc.perform(get("/api/v1/characters/me"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.userId").value("guest"))
                .andExpect(jsonPath("$.characterId").exists())
                .andExpect(jsonPath("$.stlPath").exists());
    }

    @Test
    void byUser_returnsCharacterForUserId() throws Exception {
        mockMvc.perform(get("/api/v1/characters/demo-user"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.userId").value("demo-user"))
                .andExpect(jsonPath("$.displayName").value("Wanderer"));
    }
}
