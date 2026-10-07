package io.dartchain.backend.auth;

import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import io.dartchain.backend.config.ApiRoutes;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.web.servlet.AutoConfigureMockMvc;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.http.MediaType;
import org.springframework.test.context.TestPropertySource;
import org.springframework.test.web.servlet.MockMvc;

import static org.hamcrest.Matchers.anyOf;
import static org.hamcrest.Matchers.containsString;
import static org.hamcrest.Matchers.is;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

@SpringBootTest
@AutoConfigureMockMvc
@TestPropertySource(properties = {
        "dartchain.auth.bootstrap-admin-username=phaseabadmin",
        "dartchain.ops.restrict-actuator=true",
        "dartchain.ops.actuator-token=phase-x-token"
})
class AuthAbIntegrationTest {

    @Autowired
    private MockMvc mockMvc;

    private final ObjectMapper objectMapper = new ObjectMapper();

    @Test
    void login_returnsJwtAndRefreshToken() throws Exception {
        String suffix = String.valueOf(System.nanoTime());
        String username = "user" + suffix;

        mockMvc.perform(post(ApiRoutes.AUTH_REGISTER_V1)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("""
                                {
                                  "username": "%s",
                                  "email": "%s@dartchain.dev",
                                  "password": "password123"
                                }
                                """.formatted(username, username)))
                .andExpect(status().isCreated())
                .andExpect(jsonPath("$.accessToken", containsString(".")))
                .andExpect(jsonPath("$.refreshToken").isNotEmpty())
                .andExpect(jsonPath("$.tokenType").value("Bearer"))
                .andExpect(jsonPath("$.user.role").value("USER"));
    }

    @Test
    void refresh_returnsNewAccessToken() throws Exception {
        String suffix = String.valueOf(System.nanoTime());
        String username = "refresh" + suffix;

        mockMvc.perform(post(ApiRoutes.AUTH_REGISTER_V1)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("""
                                {
                                  "username": "%s",
                                  "email": "%s@dartchain.dev",
                                  "password": "password123"
                                }
                                """.formatted(username, username)))
                .andExpect(status().isCreated());

        String loginBody = mockMvc.perform(post(ApiRoutes.AUTH_LOGIN_V1)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("""
                                {
                                  "identifier": "%s",
                                  "password": "password123"
                                }
                                """.formatted(username)))
                .andExpect(status().isOk())
                .andReturn()
                .getResponse()
                .getContentAsString();

        JsonNode login = objectMapper.readTree(loginBody);
        String refreshToken = login.get("refreshToken").asText();

        mockMvc.perform(post(ApiRoutes.AUTH_REFRESH_V1)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("""
                                {"refreshToken": "%s"}
                                """.formatted(refreshToken)))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.accessToken").exists())
                .andExpect(jsonPath("$.refreshToken").exists());
    }

    @Test
    void opsSnapshot_requiresAdminRole() throws Exception {
        String username = "phaseabadmin";

        mockMvc.perform(post(ApiRoutes.AUTH_REGISTER_V1)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("""
                                {
                                  "username": "%s",
                                  "email": "%s@dartchain.dev",
                                  "password": "password123"
                                }
                                """.formatted(username, username)))
                .andExpect(status().is(anyOf(is(201), is(409))));

        String loginBody = mockMvc.perform(post(ApiRoutes.AUTH_LOGIN_V1)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("""
                                {
                                  "identifier": "%s",
                                  "password": "password123"
                                }
                                """.formatted(username)))
                .andExpect(status().isOk())
                .andReturn()
                .getResponse()
                .getContentAsString();

        String accessToken = objectMapper.readTree(loginBody).get("accessToken").asText();

        mockMvc.perform(get("/api/ops/snapshot")
                        .header("Authorization", "Bearer " + accessToken)
                        .header("X-Actuator-Token", "phase-x-token"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.phase").value("AF"));
    }

    @Test
    void opsSnapshot_deniesRegularUser() throws Exception {
        String suffix = String.valueOf(System.nanoTime());
        String username = "regular" + suffix;

        mockMvc.perform(post(ApiRoutes.AUTH_REGISTER_V1)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("""
                                {
                                  "username": "%s",
                                  "email": "%s@dartchain.dev",
                                  "password": "password123"
                                }
                                """.formatted(username, username)))
                .andExpect(status().isCreated());

        String loginBody = mockMvc.perform(post(ApiRoutes.AUTH_LOGIN_V1)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("""
                                {
                                  "identifier": "%s",
                                  "password": "password123"
                                }
                                """.formatted(username)))
                .andExpect(status().isOk())
                .andReturn()
                .getResponse()
                .getContentAsString();

        String accessToken = objectMapper.readTree(loginBody).get("accessToken").asText();

        mockMvc.perform(get("/api/ops/snapshot")
                        .header("Authorization", "Bearer " + accessToken)
                        .header("X-Actuator-Token", "phase-x-token"))
                .andExpect(status().isForbidden());
    }
}
