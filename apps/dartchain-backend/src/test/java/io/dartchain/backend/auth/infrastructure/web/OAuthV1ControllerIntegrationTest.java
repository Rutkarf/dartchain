package io.dartchain.backend.auth.infrastructure.web;

import io.dartchain.backend.config.ApiRoutes;
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
class OAuthV1ControllerIntegrationTest {

    @Autowired
    private MockMvc mockMvc;

    @Test
    void providers_listsKnownOAuthProviders() throws Exception {
        mockMvc.perform(get(ApiRoutes.AUTH_V1_PREFIX + "/oauth/providers"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.providers").isArray())
                .andExpect(jsonPath("$.providers[?(@.id=='google')]").exists())
                .andExpect(jsonPath("$.providers[?(@.id=='github')]").exists());
    }

    @Test
    void connect_unknownProvider_returnsBadRequest() throws Exception {
        mockMvc.perform(get(ApiRoutes.AUTH_V1_PREFIX + "/oauth/connect/not-a-provider"))
                .andExpect(status().isBadRequest());
    }
}
