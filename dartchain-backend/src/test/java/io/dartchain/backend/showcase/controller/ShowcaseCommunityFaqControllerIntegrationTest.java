package io.dartchain.backend.showcase.controller;

import io.dartchain.backend.support.MockMvcIntegrationSupport;
import io.dartchain.backend.support.MockMvcIntegrationSupport.Session;
import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.web.servlet.AutoConfigureMockMvc;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.http.MediaType;
import org.springframework.test.web.servlet.MockMvc;

import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.patch;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

@SpringBootTest
@AutoConfigureMockMvc
class ShowcaseCommunityFaqControllerIntegrationTest {

    @Autowired
    private MockMvc mockMvc;

    private final ObjectMapper objectMapper = new ObjectMapper();

    @Test
    void listQuestions_isPublic() throws Exception {
        mockMvc.perform(get("/api/showcase/faq/questions"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.questions").isArray())
                .andExpect(jsonPath("$.totalCount").isNumber());
    }

    @Test
    void getLatest_isPublic() throws Exception {
        mockMvc.perform(get("/api/showcase/faq/questions/latest"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.title").isNotEmpty());
    }

    @Test
    void createQuestion_withoutAuth_isUnauthorized() throws Exception {
        mockMvc.perform(post("/api/showcase/faq/questions")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("""
                                {
                                  "title": "Question communautaire test",
                                  "body": "Corps de question suffisamment long pour validation."
                                }
                                """))
                .andExpect(status().isUnauthorized())
                .andExpect(jsonPath("$.status").value(401));
    }

    @Test
    void createQuestion_withAuth_createsQuestion() throws Exception {
        Session session = MockMvcIntegrationSupport.register(mockMvc);

        mockMvc.perform(post("/api/showcase/faq/questions")
                        .header("Authorization", session.authHeader())
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("""
                                {
                                  "title": "Question communautaire test",
                                  "body": "Corps de question suffisamment long pour validation."
                                }
                                """))
                .andExpect(status().isCreated())
                .andExpect(jsonPath("$.title").value("Question communautaire test"))
                .andExpect(jsonPath("$.authorName").value(session.username()))
                .andExpect(jsonPath("$.status").value("ACTIVE"));
    }

    @Test
    void voteQuestion_withAuth_updatesScore() throws Exception {
        Session session = MockMvcIntegrationSupport.register(mockMvc);

        String raw = mockMvc.perform(post("/api/showcase/faq/questions")
                        .header("Authorization", session.authHeader())
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("""
                                {
                                  "title": "Vote communautaire sur cette question",
                                  "body": "Corps de question suffisamment long pour validation."
                                }
                                """))
                .andExpect(status().isCreated())
                .andReturn()
                .getResponse()
                .getContentAsString();

        JsonNode body = objectMapper.readTree(raw);
        String id = body.path("id").asText();

        mockMvc.perform(post("/api/showcase/faq/questions/" + id + "/vote")
                        .header("Authorization", session.authHeader())
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("""
                                {
                                  "direction": "UP"
                                }
                                """))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.upvotes").value(1))
                .andExpect(jsonPath("$.score").value(1))
                .andExpect(jsonPath("$.userVote").value("UP"));
    }

    @Test
    void updateStatus_withoutAdmin_isForbidden() throws Exception {
        Session session = MockMvcIntegrationSupport.register(mockMvc);

        String latestRaw = mockMvc.perform(get("/api/showcase/faq/questions/latest"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.id").isNotEmpty())
                .andReturn()
                .getResponse()
                .getContentAsString();
        String id = objectMapper.readTree(latestRaw).path("id").asText();

        mockMvc.perform(patch("/api/showcase/faq/questions/" + id + "/status")
                        .header("Authorization", session.authHeader())
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("""
                                {
                                  "status": "ARCHIVED"
                                }
                                """))
                .andExpect(status().isForbidden());
    }
}
