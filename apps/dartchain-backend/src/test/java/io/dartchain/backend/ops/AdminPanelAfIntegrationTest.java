package io.dartchain.backend.ops;

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
import static org.hamcrest.Matchers.is;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

@SpringBootTest
@AutoConfigureMockMvc
@TestPropertySource(properties = {
        "dartchain.ops.restrict-actuator=true",
        "dartchain.ops.actuator-token=phase-af-token",
        "dartchain.auth.bootstrap-admin-username=opsadmin"
})
class AdminPanelAfIntegrationTest {

    @Autowired
    private MockMvc mockMvc;

    private final ObjectMapper objectMapper = new ObjectMapper();

    @Test
    void v1Snapshot_withAdminBearerOnly_succeedsWithoutActuatorToken() throws Exception {
        String accessToken = loginAsOpsAdmin();

        mockMvc.perform(get(ApiRoutes.OPS_SNAPSHOT_V1)
                        .header("Authorization", "Bearer " + accessToken))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.phase").value("AF"))
                .andExpect(jsonPath("$.metadata.observabilityModel").value("native-json"));
    }

    @Test
    void v1Snapshot_withoutAuth_isForbidden() throws Exception {
        mockMvc.perform(get(ApiRoutes.OPS_SNAPSHOT_V1))
                .andExpect(status().isForbidden());
    }

    private String loginAsOpsAdmin() throws Exception {
        mockMvc.perform(post(ApiRoutes.AUTH_REGISTER_V1)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("""
                                {
                                  "username": "opsadmin",
                                  "email": "opsadmin@dartchain.dev",
                                  "password": "password123"
                                }
                                """))
                .andExpect(status().is(anyOf(is(201), is(409))));

        String loginBody = mockMvc.perform(post(ApiRoutes.AUTH_LOGIN_V1)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("""
                                {
                                  "identifier": "opsadmin",
                                  "password": "password123"
                                }
                                """))
                .andExpect(status().isOk())
                .andReturn()
                .getResponse()
                .getContentAsString();

        return objectMapper.readTree(loginBody).get("accessToken").asText();
    }
}
