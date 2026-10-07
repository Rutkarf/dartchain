package io.dartchain.backend.metaverse.wigle;

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
class WigleVisualizationControllerIntegrationTest {

    @Autowired
    private MockMvc mockMvc;

    @Test
    void getBuildings_isPublic_andReturnsAggregates() throws Exception {
        mockMvc.perform(get("/api/metaverse/wigle/buildings"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.type").value("WIGLE_VISUALIZATION"))
                .andExpect(jsonPath("$.source").value("mock"))
                .andExpect(jsonPath("$.aggregates").isArray())
                .andExpect(jsonPath("$.totalObservations").isNumber());
    }

    @Test
    void getPoints_isPublic_andReturnsGeoPoints() throws Exception {
        mockMvc.perform(get("/api/metaverse/wigle/points"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.type").value("WIGLE_GEO_POINTS"))
                .andExpect(jsonPath("$.points").isArray())
                .andExpect(jsonPath("$.points[0].latitude").isNumber())
                .andExpect(jsonPath("$.points[0].networkName").isNotEmpty());
    }
}
