package io.dartchain.backend.metaverse.placement;

import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.web.servlet.AutoConfigureMockMvc;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.http.MediaType;
import org.springframework.test.web.servlet.MockMvc;

import static org.hamcrest.Matchers.hasSize;
import static org.hamcrest.Matchers.startsWith;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

@SpringBootTest
@AutoConfigureMockMvc
class PlacementControllerIntegrationTest {

    @Autowired
    private MockMvc mockMvc;

    @Test
    void listPlacements_isPublic_andReturnsAuthorizedCatalog() throws Exception {
        mockMvc.perform(get("/api/metaverse/placements")
                        .param("south", "43.28")
                        .param("north", "43.3095")
                        .param("west", "5.354")
                        .param("east", "5.394"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.type").value("METAVERSE_PLACEMENTS"))
                .andExpect(jsonPath("$.source").value("authorized-api"))
                .andExpect(jsonPath("$.serverTime").isNotEmpty())
                .andExpect(jsonPath("$.placements", hasSize(4)))
                .andExpect(jsonPath("$.buildings", hasSize(4)))
                .andExpect(jsonPath("$.placements[0].id").value("dev-placement-01"))
                .andExpect(jsonPath("$.placements[0].anchorWorld.coordinateSystemVersion")
                        .value("marseille-local-v1"))
                .andExpect(jsonPath("$.placements[0].anchorGeo.latitude").isNumber())
                .andExpect(jsonPath("$.offers", hasSize(4)));
    }

    @Test
    void getPlacement_isPublic_andReturnsDetail() throws Exception {
        mockMvc.perform(get("/api/metaverse/placements/dev-placement-02"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.type").value("METAVERSE_PLACEMENT_DETAIL"))
                .andExpect(jsonPath("$.placement.id").value("dev-placement-02"))
                .andExpect(jsonPath("$.building.id").value("mirror-adjacent-building-02"))
                .andExpect(jsonPath("$.merchant.id").value("dev-merchant-vitrine"))
                .andExpect(jsonPath("$.campaign.id").value("dev-campaign-demo"));
    }

    @Test
    void getPlacement_unknownId_returns404() throws Exception {
        mockMvc.perform(get("/api/metaverse/placements/missing"))
                .andExpect(status().isNotFound());
    }

    @Test
    void postInquiry_isPublic_andReceivesRequest() throws Exception {
        mockMvc.perform(post("/api/metaverse/placements/dev-placement-01/inquiries")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{\"placementId\":\"dev-placement-01\",\"contactEmail\":\"a@example.com\"}"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.status").value("received"))
                .andExpect(jsonPath("$.inquiryId", startsWith("inq-")));
    }

    @Test
    void postInquiry_pausedPlacement_isRejected() throws Exception {
        mockMvc.perform(post("/api/metaverse/placements/dev-placement-04/inquiries")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{}"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.status").value("rejected"));
    }
}
