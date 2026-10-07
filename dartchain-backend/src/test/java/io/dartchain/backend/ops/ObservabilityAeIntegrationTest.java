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

import static org.hamcrest.Matchers.greaterThan;
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
        "dartchain.ops.actuator-token=phase-ae-token",
        "dartchain.auth.bootstrap-admin-username=opsadmin",
        "management.endpoints.web.exposure.include=health,info"
})
class ObservabilityAeIntegrationTest {

    @Autowired
    private MockMvc mockMvc;

    private final ObjectMapper objectMapper = new ObjectMapper();

    @Test
    void v1Snapshot_withAdminBearer_returnsAeMetrics() throws Exception {
        String accessToken = loginAsOpsAdmin();

        mockMvc.perform(get(ApiRoutes.OPS_SNAPSHOT_V1)
                        .header("Authorization", "Bearer " + accessToken)
                        .header(ActuatorAccessFilter.ACTUATOR_TOKEN_HEADER, "phase-ae-token"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.phase").value("AF"))
                .andExpect(jsonPath("$.latency.requestCount").exists())
                .andExpect(jsonPath("$.metadata.observabilityModel").value("native-json"))
                .andExpect(jsonPath("$.metadata.metricsApiV1").value("/api/v1/ops/snapshot"))
                .andExpect(jsonPath("$.gauges.chainId").value(3377));
    }

    @Test
    void healthV1_exposesObservabilityPointers() throws Exception {
        mockMvc.perform(get(ApiRoutes.HEALTH_V1))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.observability.model").value("native-json"))
                .andExpect(jsonPath("$.observability.metricsApi").value("/api/v1/ops/snapshot"));
    }

    @Test
    void actuatorInfo_pointsToV1MetricsApi() throws Exception {
        mockMvc.perform(get("/actuator/info"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.ops.metrics-api").value("/api/v1/ops/snapshot"))
                .andExpect(jsonPath("$.ops.observabilityModel").value("native-json"));
    }

    @Test
    void requests_recordLatencyAfterHealthCall() throws Exception {
        String accessToken = loginAsOpsAdmin();

        mockMvc.perform(get("/api/health"))
                .andExpect(status().isOk())
                .andExpect(header().exists(RequestCorrelationFilter.REQUEST_ID_HEADER));

        mockMvc.perform(get(ApiRoutes.OPS_SNAPSHOT_V1)
                        .header("Authorization", "Bearer " + accessToken)
                        .header(ActuatorAccessFilter.ACTUATOR_TOKEN_HEADER, "phase-ae-token"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.latency.requestCount", greaterThan(0)));
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
