package io.dartchain.backend.showcase.controller;

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
class ShowcaseChatControllerIntegrationTest {

    @Autowired
    private MockMvc mockMvc;

    @Test
    void getMessages_isPublic() throws Exception {
        mockMvc.perform(get("/api/showcase/chat/messages"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.roomId").isNotEmpty())
                .andExpect(jsonPath("$.messages").isArray());
    }

    @Test
    void postMessage_withoutAuth_isUnauthorized() throws Exception {
        mockMvc.perform(post("/api/showcase/chat/messages")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("""
                                {
                                  "author": "guest",
                                  "text": "hello"
                                }
                                """))
                .andExpect(status().isUnauthorized())
                .andExpect(jsonPath("$.status").value(401));
    }

    @Test
    void postMessage_withAuth_createsMessage() throws Exception {
        Session session = MockMvcIntegrationSupport.register(mockMvc);

        mockMvc.perform(post("/api/showcase/chat/messages")
                        .header("Authorization", session.authHeader())
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("""
                                {
                                  "author": "%s",
                                  "text": "phase-o-chat"
                                }
                                """.formatted(session.username())))
                .andExpect(status().isCreated())
                .andExpect(jsonPath("$.text").value("phase-o-chat"))
                .andExpect(jsonPath("$.author").value(session.username()));
    }
}
