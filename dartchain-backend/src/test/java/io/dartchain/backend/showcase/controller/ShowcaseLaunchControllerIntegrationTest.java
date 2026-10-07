package io.dartchain.backend.showcase.controller;

import io.dartchain.backend.support.MockMvcIntegrationSupport;
import io.dartchain.backend.support.MockMvcIntegrationSupport.Session;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.web.servlet.AutoConfigureMockMvc;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.http.MediaType;
import org.springframework.test.web.servlet.MockMvc;

import java.util.UUID;

import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

@SpringBootTest
@AutoConfigureMockMvc
class ShowcaseLaunchControllerIntegrationTest {

    @Autowired
    private MockMvc mockMvc;

    @Test
    void listProjects_isPublic() throws Exception {
        mockMvc.perform(get("/api/showcase/launch/projects"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$").isArray());
    }

    @Test
    void createProject_withoutAuth_isUnauthorized() throws Exception {
        mockMvc.perform(post("/api/showcase/launch/projects")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("""
                                {
                                  "name": "Guest Token",
                                  "symbol": "GST"
                                }
                                """))
                .andExpect(status().isUnauthorized())
                .andExpect(jsonPath("$.status").value(401));
    }

    @Test
    void createProject_withAuth_createsProject() throws Exception {
        Session session = MockMvcIntegrationSupport.register(mockMvc);
        String symbol = "O" + UUID.randomUUID().toString().replace("-", "").substring(0, 5).toUpperCase();

        mockMvc.perform(post("/api/showcase/launch/projects")
                        .header("Authorization", session.authHeader())
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("""
                                {
                                  "name": "Phase O Token",
                                  "symbol": "%s"
                                }
                                """.formatted(symbol)))
                .andExpect(status().isCreated())
                .andExpect(jsonPath("$.symbol").value(symbol))
                .andExpect(jsonPath("$.name").value("Phase O Token"));
    }
}
