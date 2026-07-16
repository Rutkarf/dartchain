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
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.header;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

@SpringBootTest
@AutoConfigureMockMvc
@TestPropertySource(properties = {
        "dartchain.ops.restrict-actuator=true",
        "dartchain.ops.actuator-token=phase-x-token",
        "dartchain.auth.bootstrap-admin-username=opsadmin"
})
class OpsControllerIntegrationTest {

    @Autowired
    private MockMvc mockMvc;

    private final ObjectMapper objectMapper = new ObjectMapper();

    @Test
    void snapshot_withoutToken_isForbidden() throws Exception {
        mockMvc.perform(get("/api/ops/snapshot"))
                .andExpect(status().isForbidden());
    }

    @Test
    void snapshot_withAdminBearerAndActuatorToken_returnsMetrics() throws Exception {
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

        String accessToken = objectMapper.readTree(loginBody).get("accessToken").asText();

        mockMvc.perform(get("/api/ops/snapshot")
                        .header("Authorization", "Bearer " + accessToken)
                        .header(ActuatorAccessFilter.ACTUATOR_TOKEN_HEADER, "phase-x-token"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.phase").value("AF"))
                .andExpect(jsonPath("$.counters").exists())
                .andExpect(jsonPath("$.latency.requestCount").exists())
                .andExpect(jsonPath("$.gauges.chainHeight").exists())
                .andExpect(jsonPath("$.gauges.mempoolSize").exists());
    }

    @Test
    void health_includesRequestIdHeader() throws Exception {
        mockMvc.perform(get("/api/health"))
                .andExpect(status().isOk())
                .andExpect(header().exists(RequestCorrelationFilter.REQUEST_ID_HEADER));
    }
}
