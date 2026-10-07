package io.dartchain.backend.quests;

import io.dartchain.backend.support.MockMvcIntegrationSupport;
import io.dartchain.backend.support.MockMvcIntegrationSupport.Session;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.web.servlet.AutoConfigureMockMvc;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.http.MediaType;
import org.springframework.test.web.servlet.MockMvc;

import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

@SpringBootTest
@AutoConfigureMockMvc
class QuestControllerIntegrationTest {

    @Autowired
    private MockMvc mockMvc;

    @Test
    void getCatalog_isPublic_andMatchesDailyDefinitions() throws Exception {
        mockMvc.perform(get("/api/quests/catalog"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.dailyTasks").isArray())
                .andExpect(jsonPath("$.dailyTasks.length()").value(4))
                .andExpect(jsonPath("$.dailyTasks[0].id").value("daily-login"))
                .andExpect(jsonPath("$.dailyTasks[3].id").value("swap-tokens"))
                .andExpect(jsonPath("$.dailyTasks[3].target").value(10))
                .andExpect(jsonPath("$.dailyTasks[3].serverHooked").value(true))
                .andExpect(jsonPath("$.mission.id").value("network-guardian"))
                .andExpect(jsonPath("$.weekly.rewardMts").value(1))
                .andExpect(jsonPath("$.serverHookedTaskIds").isArray());
    }

    @Test
    void getState_withoutAuth_isUnauthorized() throws Exception {
        mockMvc.perform(get("/api/quests/state"))
                .andExpect(status().isUnauthorized())
                .andExpect(jsonPath("$.status").value(401));
    }

    @Test
    void getState_withAuth_returnsQuestPayload() throws Exception {
        Session session = MockMvcIntegrationSupport.register(mockMvc);

        mockMvc.perform(get("/api/quests/state").header("Authorization", session.authHeader()))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.dayKey").isNotEmpty())
                .andExpect(jsonPath("$.tasks").isMap())
                .andExpect(jsonPath("$.totalXp").exists());
    }

    @Test
    void exploreBlock_withAuth_updatesProgress() throws Exception {
        Session session = MockMvcIntegrationSupport.register(mockMvc);

        mockMvc.perform(post("/api/quests/explore-block")
                        .header("Authorization", session.authHeader())
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("""
                                {"blockIndex": 0}
                                """))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.tasks['explore-blocks'].progress").value(1));
    }
}
